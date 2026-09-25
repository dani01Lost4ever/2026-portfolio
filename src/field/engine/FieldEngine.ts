/**
 * FieldEngine: the WebGL side of the field. Owns the renderer, the morphing point cloud, the
 * ambient dust, the background gradient and pointer interaction. It knows nothing about the
 * DOM beyond the measurements the driver hands it (see FieldController).
 */
import * as THREE from 'three'
import type { ShapeId } from '../contract'
import { AMBIENT_FRAG, AMBIENT_VERT, BG_FRAG, BG_VERT, POINTS_FRAG, POINTS_VERT } from './shaders'
import { SHAPES, extent, genClusters, genHelix, type ClusterSpot, type HelixCfg } from './shapes'
import { PointerInput } from './input'
import { clamp, hexToRgb, jit, lerp, power2InOut, rng, type RGB, type Vec3 } from './math'
import type { StopGeom, StopSpec, ViewportInfo } from './stops'

export const FOV = 40
export const CAMZ = 14

/** World units per CSS pixel on the z = 0 plane at rest. */
export const worldPerPixel = (h: number): number => (2 * Math.tan(((FOV / 2) * Math.PI) / 180) * CAMZ) / h

/** Where a side stop's shape sits at rest, in viewport px: its centre column and projected bottom edge. */
export interface RestBox {
  cx: number
  bottom: number
}

/** Side stops sit a little above centre, leaving the band below the shape for its caption. */
const SIDE_LIFT = 0.03
/** Share of the viewport height a side shape may fill, measured on screen (perspective included). */
const SIDE_FILL_H = 0.7

interface RenderStop {
  key: string
  shape: ShapeId
  buf: Float32Array
  ext: [number, number, number]
  xf: Vec3
  rotW: [number, number]
  lock: number
  push: number
  alpha: number
  off: Vec3
  scale: number
  t0: RGB
  t1: RGB
  tAmt: number
  bgA: RGB
  bgB: RGB
  anchor: number
  /** Side stops on desktop: the rest box their caption is placed under. */
  rest: RestBox | null
  /** Set on the snapshot of a previous page's stop while it morphs away (route change). */
  frozen: Vec3 | null
}

export interface FrameInput {
  /** Seconds (RAF timestamp / 1000). */
  time: number
  /** Current stop pair (i, i + 1) and eased travel between them. */
  i: number
  T: number
  /** Raw window scroll, for lock/parallax. */
  sy: number
  /** Hover/pulse effect for stop k: (pulse, group, groupAmount). */
  fx(k: number, out: THREE.Vector3): void
}

interface Tween {
  from: number
  to: number
  t0: number
  dur: number
  delay: number
}

const ZERO3: Vec3 = [0, 0, 0]
const BLACK: RGB = [0, 0, 0]

export class FieldEngine {
  readonly N: number
  private readonly canvas: HTMLCanvasElement
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera: THREE.PerspectiveCamera
  private readonly bgU: { uTop: { value: THREE.Vector3 }; uBot: { value: THREE.Vector3 }; uGlow: { value: THREE.Vector2 } }
  private readonly U: Record<string, THREE.IUniform>
  private readonly AU: Record<string, THREE.IUniform>
  private readonly aFrom: THREE.BufferAttribute
  private readonly aTo: THREE.BufferAttribute
  private readonly disposables: { dispose(): void }[] = []
  private readonly input: PointerInput
  private readonly onLost: (e: Event) => void

  private stops: RenderStop[] = []
  private ghost: RenderStop | null = null
  private morph: { t0: number; dur: number } | null = null
  private scatter: Tween = { from: 1, to: 1, t0: NaN, dur: 1, delay: 0 }
  private cache = new Map<string, { buf: Float32Array; ext: [number, number, number] }>()
  private fontVer = 0
  private curA: Float32Array | null = null
  private curB: Float32Array | null = null
  private shownA: RenderStop | null = null
  private shownB: RenderStop | null = null
  private shownT = 0
  private wpp = 1
  private Wd = 1
  private Hd = 1
  private lastTime = 0
  private lastDive = 0
  private lastSy = 0
  private readonly tmp = new THREE.Vector3()
  private readonly mouseT = new THREE.Vector3(99, 99, 0)
  private readonly mousePrev = new THREE.Vector3(99, 99, 0)
  private readonly velRaw = new THREE.Vector2()
  private readonly waveTmp = new THREE.Vector3()

  constructor(host: HTMLElement, opts: { onContextLost(): void }) {
    const mobile = window.innerWidth < 900
    this.N = mobile ? 4200 : 10000
    const N = this.N
    const canvas = document.createElement('canvas')
    canvas.className = 'field-gl'
    canvas.setAttribute('aria-hidden', 'true')
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'
    host.appendChild(canvas)
    this.canvas = canvas
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' })
    } catch (err) {
      canvas.remove()
      throw err
    }
    const renderer = this.renderer
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(window.innerWidth, window.innerHeight, false)
    renderer.setClearColor(0x04181d, 1)
    this.camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 0.1, 100)
    this.camera.position.set(0, 0, CAMZ)
    this.Wd = window.innerWidth
    this.Hd = window.innerHeight
    this.wpp = worldPerPixel(this.Hd)

    /* background gradient */
    this.bgU = { uTop: { value: new THREE.Vector3() }, uBot: { value: new THREE.Vector3() }, uGlow: { value: new THREE.Vector2(0.7, 0.5) } }
    const bgGeo = new THREE.PlaneGeometry(2, 2)
    const bgMat = new THREE.ShaderMaterial({ uniforms: this.bgU, depthTest: false, depthWrite: false, vertexShader: BG_VERT, fragmentShader: BG_FRAG })
    const bg = new THREE.Mesh(bgGeo, bgMat)
    bg.frustumCulled = false
    bg.renderOrder = -1
    this.scene.add(bg)

    /* point cloud */
    const geo = new THREE.BufferGeometry()
    const dust = new Float32Array(N * 3)
    const rnd = new Float32Array(N * 4)
    const rr = rng(123)
    for (let i = 0; i < N; i++) {
      dust[i * 3] = jit(rr, 11)
      dust[i * 3 + 1] = jit(rr, 6.5)
      dust[i * 3 + 2] = jit(rr, 5)
      rnd[i * 4] = 0.42 * ((0.55 * i) / N + 0.45 * rr())
      rnd[i * 4 + 1] = rr()
      rnd[i * 4 + 2] = rr()
      rnd[i * 4 + 3] = rr()
    }
    this.aFrom = new THREE.BufferAttribute(new Float32Array(N * 4), 4)
    this.aTo = new THREE.BufferAttribute(new Float32Array(N * 4), 4)
    this.aFrom.setUsage(THREE.DynamicDrawUsage)
    this.aTo.setUsage(THREE.DynamicDrawUsage)
    geo.setAttribute('position', new THREE.BufferAttribute(dust, 3))
    geo.setAttribute('aFrom', this.aFrom)
    geo.setAttribute('aTo', this.aTo)
    geo.setAttribute('aRand', new THREE.BufferAttribute(rnd, 4))
    const v3 = (h: string): THREE.Vector3 => new THREE.Vector3().fromArray(hexToRgb(h))
    this.U = {
      uTime: { value: 0 }, uT: { value: 0 }, uScatter: { value: 1 },
      uSize: { value: 30 }, uPR: { value: renderer.getPixelRatio() }, uAlpha: { value: 1 },
      uMouse: { value: new THREE.Vector3(99, 99, 0) }, uMouseVel: { value: new THREE.Vector2() }, uHover: { value: 0 }, uMouseAmt: { value: 1 },
      uWaves: { value: Array.from({ length: 8 }, () => new THREE.Vector3(99, 99, -99)) },
      uTA0: { value: new THREE.Vector3() }, uTA1: { value: new THREE.Vector3() }, uTB0: { value: new THREE.Vector3() }, uTB1: { value: new THREE.Vector3() },
      uTAa: { value: 0 }, uTBa: { value: 0 },
      uRotA: { value: new THREE.Vector2() }, uRotB: { value: new THREE.Vector2() },
      uFxA: { value: new THREE.Vector3() }, uFxB: { value: new THREE.Vector3() },
      uSA: { value: 1 }, uSB: { value: 1 },
      uXfA: { value: new THREE.Vector3() }, uXfB: { value: new THREE.Vector3() },
      uOA: { value: new THREE.Vector3() }, uOB: { value: new THREE.Vector3() },
      uColA: { value: v3('#5ED8CB') },
      uColB: { value: v3('#FF8A6A') },
      uColH: { value: v3('#FFE8D4') },
    }
    const pMat = new THREE.ShaderMaterial({
      uniforms: this.U, vertexShader: POINTS_VERT, fragmentShader: POINTS_FRAG,
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    })
    const points = new THREE.Points(geo, pMat)
    points.frustumCulled = false
    points.renderOrder = 1
    this.scene.add(points)

    /* ambient layer: sparse dim dust through the whole viewport, in depth */
    const NA = mobile ? 1200 : 2600
    const ar = rng(321)
    const aPos = new Float32Array(NA * 3)
    const aSeed = new Float32Array(NA * 4)
    const spanX = (14 * Math.max(window.innerWidth / window.innerHeight, 0.6)) / 1.6 + 2
    for (let q = 0; q < NA; q++) {
      aPos[q * 3] = jit(ar, spanX)
      aPos[q * 3 + 1] = jit(ar, 9)
      aPos[q * 3 + 2] = -10 + ar() * 16
      aSeed[q * 4] = ar()
      aSeed[q * 4 + 1] = ar()
      aSeed[q * 4 + 2] = ar()
      aSeed[q * 4 + 3] = ar()
    }
    const ageo = new THREE.BufferGeometry()
    ageo.setAttribute('position', new THREE.BufferAttribute(aPos, 3))
    ageo.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 4))
    const U = this.U
    this.AU = {
      uTime: U.uTime, uPR: U.uPR, uHover: U.uHover, uColA: U.uColA, uColB: U.uColB,
      uScroll: { value: 0 }, uCam: { value: new THREE.Vector3(0, 0, CAMZ) }, uRay: { value: new THREE.Vector3(0, 0, -1) },
      uWaves: U.uWaves, uSize: { value: mobile ? 26 : 22 },
    }
    const aMat = new THREE.ShaderMaterial({
      uniforms: this.AU, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      vertexShader: AMBIENT_VERT, fragmentShader: AMBIENT_FRAG,
    })
    const ambient = new THREE.Points(ageo, aMat)
    ambient.frustumCulled = false
    ambient.renderOrder = 0
    this.scene.add(ambient)

    this.disposables.push(bgGeo, bgMat, geo, pMat, ageo, aMat)

    this.onLost = (e: Event) => {
      e.preventDefault()
      opts.onContextLost()
    }
    canvas.addEventListener('webglcontextlost', this.onLost)
    this.input = new PointerInput({ onShock: (x, y) => this.shock(x, y) })
  }

  /** Web fonts arrived: font-dependent shapes (the "@") are rebuilt on the next setStops. */
  fontsChanged(): void {
    this.fontVer++
  }

  /**
   * Rebuild render data for the current stops. `pageChanged` = the stop set was replaced
   * wholesale (route change): the shape on screen morphs into the new page's shape.
   */
  setStops(specs: StopSpec[], geoms: StopGeom[], vp: ViewportInfo, pageChanged: boolean): void {
    const shown = this.displayed()
    const wasEmpty = this.stops.length === 0
    this.Wd = vp.w
    this.Hd = vp.h
    this.wpp = worldPerPixel(vp.h)
    const used = new Set<string>()
    const next = specs.map((s, k) => this.makeStop(s, geoms[k], vp, used))
    if (shown && ((pageChanged && next.length) || !next.length)) {
      this.ghost = { ...shown, frozen: this.offsetOf(shown, this.lastSy) }
      used.add(this.ghost.key)
    }
    if (!next.length) {
      this.morph = null
      if (this.ghost) this.scatterTo(1, 1.2, 0)
    } else if (this.ghost && (pageChanged || wasEmpty)) {
      this.morph = { t0: NaN, dur: 1.5 }
      if (wasEmpty) this.scatterTo(0, 1.4, 0)
    } else if (wasEmpty) {
      // first stops ever: the intro, dust gathering into the first shape
      this.scatterTo(0, 3.2, 0.25)
    }
    if (!this.morph && next.length) this.ghost = null
    this.stops = next
    // keep only buffers that are in use (plus the ghost's)
    const keep = new Set<Float32Array>(next.map((s) => s.buf))
    if (this.ghost) keep.add(this.ghost.buf)
    for (const [k, v] of this.cache) if (!keep.has(v.buf)) this.cache.delete(k)
    this.U.uSize.value = vp.mobile ? 34 : 30 * clamp(vp.h / 900, 0.75, 1.4)
    this.curA = this.curB = null
  }

  private cached(key: string, xf: Vec3, gen: () => Float32Array, used: Set<string>): { buf: Float32Array; ext: [number, number, number] } {
    used.add(key)
    let hit = this.cache.get(key)
    if (!hit) {
      const buf = gen()
      hit = { buf, ext: extent(buf, xf) }
      this.cache.set(key, hit)
    }
    return hit
  }

  private makeStop(spec: StopSpec, g: StopGeom, vp: ViewportInfo, used: Set<string>): RenderStop {
    const def = SHAPES[spec.shape]
    const N = this.N
    const Wd = vp.w
    const Hd = vp.h
    const wpp = this.wpp
    const mobile = vp.mobile
    const tablet = vp.tablet
    const qx = Wd * 0.25 * wpp
    const topY = Hd * 0.235 * wpp
    const visW = Wd * wpp
    const visH = Hd * wpp
    const top = mobile || spec.side === 'top'
    let entry: { buf: Float32Array; ext: [number, number, number] }
    let off: Vec3 = [0, 0, 0]
    let scale = 1
    let alpha = def.alpha

    if (def.layout === 'clusters') {
      const maxC = Math.max(5, ...g.spots.map((s) => s.count))
      const spots: ClusterSpot[] = g.spots.map((s) => {
        const base = s.size * 0.5 * wpp * 0.92
        return { x: (s.cx - Wd / 2) * wpp, y: -(s.cy - Hd / 2) * wpp, rad: base * Math.sqrt(s.count / maxC), count: s.count }
      })
      const key = 'clusters:' + spots.map((s) => [s.x, s.y, s.rad].map((v) => v.toFixed(2)).join(',') + ',' + s.count).join(';')
      entry = this.cached(key, def.xf, () => genClusters(N, spots), used)
    } else if (def.layout === 'helix') {
      // one ring per timeline entry, newest at the top, sized to stay whole in the viewport
      const nm = Math.max(1, spec.rings || g.rings.length || 6)
      const tp = mobile ? 1.9 : Math.min(visH * 0.3, 3.7)
      const cfg: HelixCfg = mobile
        ? { markers: [], yMin: -2.5, yMax: 2.5, R: 0.95, ringR: 1.35, tilt: 0.1 }
        : { markers: [], yMin: -tp - 0.9, yMax: tp + 0.9, R: 1.45, ringR: 2.05, tilt: 0.1 }
      for (let m = 0; m < nm; m++) cfg.markers.push(tp - (m * 2 * tp) / Math.max(nm - 1, 1))
      entry = this.cached(`helix:${mobile ? 1 : 0}:${nm}:${tp.toFixed(2)}`, def.xf, () => genHelix(N, cfg), used)
    } else {
      const gen = def.gen ?? SHAPES.constellation.gen
      const key = spec.shape + (def.fontDependent ? `:f${this.fontVer}` : '')
      entry = this.cached(key, def.xf, () => (gen ? gen(N) : new Float32Array(N * 4)), used)
    }
    const ext = entry.ext
    const fit = (w: number, h: number, lo: number, hi: number): number =>
      clamp(Math.min(w / (2 * Math.max(ext[0], 1e-3)), h / (2 * Math.max(ext[1], 1e-3))), lo, hi)
    // like fit, but for the size on screen: points nearer the camera than z = 0 are drawn larger
    // (the 1.02 covers the shader's breathing)
    const ez = 1.02 * ext[2]
    const onScreen = (e: number, s: number): number => (1.02 * e * s * CAMZ) / Math.max(CAMZ - ez * s, 1e-3)
    const fitOnScreen = (w: number, h: number, lo: number, hi: number): number => {
      const sx = ((w / 2) * CAMZ) / (1.02 * Math.max(ext[0], 1e-3) * CAMZ + (w / 2) * ez)
      const sy = ((h / 2) * CAMZ) / (1.02 * Math.max(ext[1], 1e-3) * CAMZ + (h / 2) * ez)
      return clamp(Math.min(sx, sy), lo, hi)
    }
    const sideX = spec.side === 'left' ? -qx : spec.side === 'right' ? qx : 0
    let rest: RestBox | null = null

    switch (def.layout) {
      case 'hero':
        off = mobile ? [0, 1.5, 0] : [0.6, -2.0, 0]
        scale = mobile ? 0.48 : 1
        break
      case 'side':
        if (top) {
          off = [0, tablet ? Hd * 0.2 * wpp : topY, 0]
          scale = fit(visW * 0.88, visH * (tablet ? 0.31 : 0.38), 0.4, 1)
        } else if (spec.side === 'center') {
          scale = fit(visW * 0.8, visH * 0.72, 0.6, 1.5)
        } else {
          // centre the shape in the free space beside the text column (half the viewport when that
          // space is unmeasured or too narrow), sized to that space as it appears on screen
          const m = Math.max(24, Wd * 0.03)
          let a = spec.side === 'left' ? m : Number.isFinite(g.textRight) ? g.textRight + m : Wd / 2
          let b = spec.side === 'left' ? (Number.isFinite(g.textLeft) ? g.textLeft - m : Wd / 2) : Wd - m
          if (b - a < Wd * 0.35) [a, b] = spec.side === 'left' ? [0, Wd / 2] : [Wd / 2, Wd]
          off = [((a + b) / 2 - Wd / 2) * wpp, visH * SIDE_LIFT, 0]
          scale = fitOnScreen((b - a) * wpp * 0.9, visH * SIDE_FILL_H, 0.6, 1.5)
          rest = { cx: (a + b) / 2, bottom: Hd * (0.5 - SIDE_LIFT) + onScreen(ext[1], scale) / wpp }
        }
        break
      case 'at':
        if (top) {
          off = [0, Hd * 0.29 * wpp, 0]
          scale = Math.min(0.54, (visW * 0.8) / 5.4)
        } else {
          off = [sideX, 0.2, 0]
          scale = fit(visW * (spec.side === 'center' ? 0.8 : 0.4), visH * 0.64, 0.6, 1.3)
        }
        break
      case 'helix':
        if (top) {
          off = [0, topY, 0]
          scale = 1
        } else if (spec.side === 'center') {
          off = [0, -0.35, 0]
          scale = 1
        } else {
          // centre the helix in the free space beside the text, never tighter than half the viewport
          const tr = Number.isFinite(g.textRight) ? g.textRight : Wd * 0.5
          const tl = Number.isFinite(g.textLeft) ? g.textLeft : Wd * 0.5
          const a = spec.side === 'left' ? 24 : Math.max(tr + 24, Wd * 0.5)
          const b = spec.side === 'left' ? Math.min(tl - 24, Wd * 0.5) : Wd - 24
          const cxp = (a + b) / 2
          const halfPx = Math.max(40, (b - a) / 2)
          off = [(cxp - Wd / 2) * wpp, -0.35, 0]
          scale = clamp((halfPx * wpp * 0.94) / 2.1, 0.6, 1.15)
        }
        alpha = mobile ? 0.7 : 1
        break
      case 'clusters':
        off = [0, 0, 0]
        scale = 1
        break
    }
    return {
      key: spec.key,
      shape: spec.shape,
      buf: entry.buf,
      ext,
      xf: def.xf,
      rotW: def.rotW,
      lock: def.lock,
      push: def.push,
      alpha,
      off,
      scale,
      t0: spec.tint ? spec.tint[0] : BLACK,
      t1: spec.tint ? spec.tint[1] : BLACK,
      tAmt: spec.tint ? 0.58 : 0,
      bgA: spec.bg[0],
      bgB: spec.bg[1],
      anchor: g.anchor,
      rest,
      frozen: null,
    }
  }

  /** Each current stop's rest box, in stop order (null for stops that have none). */
  restBoxes(): (RestBox | null)[] {
    return this.stops.map((s) => s.rest)
  }

  private offsetOf(s: RenderStop, sy: number): Vec3 {
    if (s.frozen) return s.frozen
    return [s.off[0], s.off[1] + (sy - s.anchor) * this.wpp * s.lock, s.off[2]]
  }

  /** The stop that is mostly on screen right now. */
  private displayed(): RenderStop | null {
    if (!this.shownA) return null
    return this.shownT < 0.5 || !this.shownB ? this.shownA : this.shownB
  }

  private scatterTo(to: number, dur: number, delay: number): void {
    this.scatter = { from: this.U.uScatter.value as number, to, t0: NaN, dur, delay }
  }

  private setPair(A: RenderStop, B: RenderStop): void {
    if (A.buf === this.curA && B.buf === this.curB) return
    this.curA = A.buf
    this.curB = B.buf
    ;(this.aFrom.array as Float32Array).set(A.buf)
    ;(this.aTo.array as Float32Array).set(B.buf)
    this.aFrom.needsUpdate = true
    this.aTo.needsUpdate = true
  }

  private worldAt(nx: number, ny: number, out: THREE.Vector3): THREE.Vector3 {
    const cam = this.camera
    this.tmp.set(nx, ny, 0.5).unproject(cam).sub(cam.position).normalize()
    const d = -cam.position.z / this.tmp.z
    return out.set(cam.position.x + this.tmp.x * d, cam.position.y + this.tmp.y * d, 0)
  }

  private shock(cx: number, cy: number): void {
    // ring buffer of 8: take a finished slot, recycle the oldest only when all are busy
    const now = this.U.uTime.value as number
    const ws = this.U.uWaves.value as THREE.Vector3[]
    let pick = -1
    let old = 0
    for (let k = 0; k < ws.length; k++) {
      if (now - ws[k].z >= 3) { pick = k; break }
      if (ws[k].z < ws[old].z) old = k
    }
    if (pick < 0) pick = old
    this.worldAt((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1, this.waveTmp)
    ws[pick].set(this.waveTmp.x, this.waveTmp.y, now)
  }

  resize(): void {
    const w = window.innerWidth
    const h = window.innerHeight
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.U.uPR.value = this.renderer.getPixelRatio()
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  frame(inp: FrameInput): void {
    const U = this.U
    const t = inp.time
    const sy = inp.sy
    this.lastSy = sy
    U.uTime.value = t
    const dt = clamp(t - this.lastTime, 1e-3, 0.05)
    this.lastTime = t

    /* which two shapes are on screen */
    const n = this.stops.length
    let A: RenderStop | null = null
    let B: RenderStop | null = null
    let T = 0
    let iA = -1
    let iB = -1
    if (this.morph && this.ghost && n) {
      if (Number.isNaN(this.morph.t0)) this.morph.t0 = t
      const k = clamp((t - this.morph.t0) / this.morph.dur, 0, 1)
      iB = clamp(Math.round(inp.i + inp.T), 0, n - 1)
      A = this.ghost
      B = this.stops[iB]
      T = power2InOut(k)
      if (k >= 1) {
        this.morph = null
        this.ghost = null
      }
    } else if (n) {
      iA = clamp(inp.i, 0, n - 1)
      iB = Math.min(iA + 1, n - 1)
      A = this.stops[iA]
      B = this.stops[iB]
      T = iA === iB ? 0 : inp.T
    } else if (this.ghost) {
      A = B = this.ghost
    }
    this.shownA = A
    this.shownB = B
    this.shownT = T

    /* scatter (intro, and dissolving when a page has no stops) */
    const sc = this.scatter
    if (Number.isNaN(sc.t0)) sc.t0 = t
    const sk = clamp((t - sc.t0 - sc.delay) / sc.dur, 0, 1)
    U.uScatter.value = A ? lerp(sc.from, sc.to, power2InOut(sk)) : 1

    const cam = this.camera
    const bgU = this.bgU
    let lockW = 0
    let dive = 0
    if (A && B) {
      this.setPair(A, B)
      U.uXfA.value.fromArray(A.xf)
      U.uXfB.value.fromArray(B.xf)
      U.uT.value = T
      const oa = this.offsetOf(A, sy)
      const ob = this.offsetOf(B, sy)
      U.uOA.value.fromArray(oa)
      U.uOB.value.fromArray(ob)
      U.uSA.value = A.scale
      U.uSB.value = B.scale
      U.uTA0.value.fromArray(A.t0)
      U.uTA1.value.fromArray(A.t1)
      U.uTAa.value = A.tAmt
      U.uTB0.value.fromArray(B.t0)
      U.uTB1.value.fromArray(B.t1)
      U.uTBa.value = B.tAmt
      U.uMouseAmt.value = lerp(A.push, B.push, T)
      const rot = this.input.rot
      U.uRotA.value.set(rot.x * A.rotW[0], rot.y * A.rotW[1])
      U.uRotB.value.set(rot.x * B.rotW[0], rot.y * B.rotW[1])
      if (iA >= 0) inp.fx(iA, U.uFxA.value)
      else U.uFxA.value.set(0, 0, 0)
      if (iB >= 0 && iB !== iA) inp.fx(iB, U.uFxB.value)
      else if (iB >= 0) U.uFxB.value.copy(U.uFxA.value)
      else U.uFxB.value.set(0, 0, 0)
      U.uAlpha.value = lerp(A.alpha, B.alpha, T)
      for (let c = 0; c < 3; c++) {
        bgU.uTop.value.setComponent(c, lerp(A.bgA[c], B.bgA[c], T))
        bgU.uBot.value.setComponent(c, lerp(A.bgB[c], B.bgB[c], T))
      }
      // soft glow behind wherever the cloud currently is
      const gx = lerp(oa[0], ob[0], T) / (this.Wd * this.wpp) + 0.5
      const gy = lerp(oa[1], ob[1], T) / (this.Hd * this.wpp) + 0.5
      bgU.uGlow.value.set(lerp(bgU.uGlow.value.x, gx, 0.08), lerp(bgU.uGlow.value.y, gy, 0.08))
      lockW = lerp(A.lock, B.lock, T)
      // leaving the hero: the camera dives into the data grid while it re-forms
      if (A.shape === 'grid' && A !== B && !A.frozen) dive = Math.sin(Math.PI * T)
    } else {
      U.uOA.value.fromArray(ZERO3)
      U.uOB.value.fromArray(ZERO3)
    }

    /* drag rotation inertia, then ease back to rest */
    this.input.step()

    /* pointer parallax (damped while the cloud is pinned to DOM labels) */
    const ptr = this.input.ptr
    const mo = ptr.active && ptr.type === 'mouse'
    ptr.sx = lerp(ptr.sx, mo ? ptr.x : 0, 0.05)
    ptr.sy = lerp(ptr.sy, mo ? ptr.y : 0, 0.05)
    const par = 1 - lockW
    cam.position.set(ptr.sx * 0.45 * par, ptr.sy * 0.3 * par - dive * 1.4, CAMZ - dive * 6.5)
    if (dive > 0 || this.lastDive > 0) {
      cam.fov = FOV + dive * 16
      cam.updateProjectionMatrix()
      this.lastDive = dive
    }
    cam.lookAt(0, -dive * 0.9, 0)

    /* pointer projected onto the cloud plane (z = 0), smoothed; velocity drives drag/swirl */
    const mouse = U.uMouse.value as THREE.Vector3
    U.uHover.value = lerp(U.uHover.value as number, ptr.active ? 1 : 0, 0.08)
    if (ptr.active) {
      this.worldAt(ptr.x, ptr.y, this.mouseT)
      if (mouse.x > 90) mouse.copy(this.mouseT)
      mouse.lerp(this.mouseT, 0.3)
      ;(this.AU.uRay.value as THREE.Vector3).copy(this.tmp)
      ;(this.AU.uCam.value as THREE.Vector3).copy(cam.position)
    }
    const vel = U.uMouseVel.value as THREE.Vector2
    this.velRaw.set((mouse.x - this.mousePrev.x) / dt, (mouse.y - this.mousePrev.y) / dt)
    if (this.mousePrev.x > 90 || this.velRaw.length() > 60) this.velRaw.set(0, 0)
    this.mousePrev.copy(mouse)
    vel.lerp(this.velRaw, 0.15)
    if (vel.length() > 4) vel.setLength(4)
    this.AU.uScroll.value = sy * this.wpp * 0.35

    this.renderer.render(this.scene, cam)
  }

  /** Release everything. `lost`: the context is already gone, don't force-lose it again. */
  dispose(lost = false): void {
    this.input.dispose()
    this.canvas.removeEventListener('webglcontextlost', this.onLost)
    for (const d of this.disposables) d.dispose()
    this.renderer.dispose()
    if (!lost) this.renderer.forceContextLoss()
    this.canvas.remove()
    this.cache.clear()
    this.stops = []
    this.ghost = null
  }
}
