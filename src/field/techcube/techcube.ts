/*!
 * TechCube — typed port of the vanilla component inlined in designs/field.html (v3).
 *
 * An isometric cube of four glass slabs. For each project the slabs turn 90deg,
 * top first, to put that project's architecture layers on the front face.
 * Each slab is independently draggable/keyboard-turnable; the cube as a whole
 * can be dragged (tilt) or tapped; a soft ambient tint can be applied via
 * `setTint`. Text fades edge-on and never renders below an 11px floor.
 *
 * No React here — see TechCube.tsx for the React wrapper.
 *
 *   const cube = createTechCube(el, { projects: [{ name, layers: [{ label, tech }] x4 }] })
 *   cube.setProgress(p)   // p in [0, projects.length - 1]; integers rest, fractions turn
 */

const DEG = Math.PI / 180
const SLABS = 4
/** slab edge/caption colours, top to bottom: Field's aqua point colour to its peach */
const ACC = ['94,216,203', '154,219,192', '255,184,138', '255,138,106']
/** light direction (screen space, y down), normalised: upper left, in front */
const LV = (() => {
  const x = -0.5
  const y = -0.7
  const z = 0.85
  const l = Math.hypot(x, y, z)
  return [x / l, y / l, z / l] as const
})()

/** turn timing, in units of p: the turn for k -> k+1 occupies [k+ZS, k+ZS+ZW] */
const ZS = 0.15
const ZW = 0.7
const DUR = 0.46
const STAG = (ZW - DUR) / (SLABS - 1)
const BASE_PITCH = -24
const BASE_YAW = -36
const TECH = 0.088
const AVAIL = 0.85 /* tech font size and usable face width, as fractions of cube size */

function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v
}
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}
function backOut(t: number, c1: number): number {
  const c3 = c1 + 1
  const u = t - 1
  return 1 + c3 * u * u * u + c1 * u * u
}
/** gentle start, slight overshoot, soft settle */
function turnEase(t: number): number {
  return backOut(smoothstep(t), 1.25)
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls: string,
  parent?: Element,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (parent) parent.appendChild(e)
  return e
}

export interface TechCubeLayer {
  label: string
  tech: string
}

export interface TechCubeProject {
  name: string
  layers: TechCubeLayer[]
}

export type TechCubePulseReason = 'hover' | 'drag' | 'turn'

export interface TechCubeOptions {
  /** All projects, in page order. Faces pick their content by index, wrapping mod 4. */
  projects: TechCubeProject[]
  /** Size the cube to fill `container` (100%/100%) instead of a fixed --tc-size. */
  fit?: boolean
  /** Exponential smoothing time constant (seconds) for scroll-driven progress. */
  smoothing?: number
  /** Force reduced-motion behaviour; omit to follow the system preference. */
  reducedMotion?: boolean
  /** Initial progress. */
  progress?: number
  /** Called whenever the rounded current index changes. */
  onChange?: (index: number, project: TechCubeProject | undefined) => void
  /** Called on hover, drag-start and (heuristically) on a settled turn. */
  onPulse?: (reason: TechCubePulseReason) => void
}

export interface TechCubeInstance {
  /** The root element (same node passed in as `container`; carries the `tc-root` class). */
  el: HTMLElement
  setProgress(p: number, opts?: { immediate?: boolean }): void
  getProgress(): number
  getIndex(): number
  /** Recompute size (fit mode) and re-measure text fits; call after resize/layout changes. */
  resize(): void
  /** Override the ambient tint used by the halo/floor/edge glow (rgb "r,g,b" or hex pair). */
  setTint(tint: string | null): void
  /** Explicitly set reduced-motion mode from outside (e.g. field.isStatic). */
  setReducedMotion(v: boolean): void
  destroy(): void
}

interface SlabFace {
  el: HTMLElement
  shade: HTMLElement
  txt: HTMLElement
  lab: HTMLElement
  tech: HTMLElement
  m: number | null
  c: Record<string, string>
}

interface Slab {
  el: HTMLElement
  rot: HTMLElement
  faces: SlabFace[]
  a: number
  man: number
  mv: number
  c: Record<string, string>
}

function styleCache(obj: HTMLElement, cache: Record<string, string>, prop: string, v: string) {
  if (cache[prop] !== v) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(obj.style as any)[prop] = v
    cache[prop] = v
  }
}

export function createTechCube(container: HTMLElement, options: TechCubeOptions): TechCubeInstance {
  if (!container) throw new Error('createTechCube: container element required')
  const opts = options
  const projects: TechCubeProject[] = (opts.projects || []).map((p) => ({
    name: String(p.name || ''),
    layers: (p.layers || []).slice(0, SLABS).map((l) => ({ label: String(l.label || ''), tech: String(l.tech || '') })),
  }))
  const n = projects.length
  const smoothing = opts.smoothing == null ? 0.09 : Math.max(0, +opts.smoothing)
  const fit = !!opts.fit
  const mqReduce: MediaQueryList | { matches: boolean } =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : { matches: false }
  let reduce = opts.reducedMotion != null ? !!opts.reducedMotion : mqReduce.matches
  let reduceLocked = opts.reducedMotion != null

  /* ---------- DOM: `container` itself is the root (`tc-root`); no extra wrapper ---------- */
  const rootEl = container
  rootEl.classList.add('tc-root')
  rootEl.classList.toggle('tc-fit', fit)
  rootEl.tabIndex = 0
  rootEl.setAttribute('role', 'group')
  rootEl.setAttribute('aria-roledescription', 'architecture cube')
  const stage = el('div', 'tc-stage', rootEl)
  el('div', 'tc-halo', stage).setAttribute('aria-hidden', 'true')
  const rig = el('div', 'tc-rig', stage)
  el('div', 'tc-floor', rig).setAttribute('aria-hidden', 'true')
  const body = el('div', 'tc-body', rig)
  const measure = el('span', 'tc-measure', rootEl)
  measure.setAttribute('aria-hidden', 'true')
  const sr = el('div', 'tc-sr', rootEl)
  sr.setAttribute('aria-live', 'polite')
  const srTitle = el('p', '', sr)
  const srList = el('ul', '', sr)

  const slabs: Slab[] = []
  for (let i = 0; i < SLABS; i++) {
    const slab = el('div', 'tc-slab', body)
    /* each slab is its own control: focusable, arrow keys turn it */
    slab.tabIndex = 0
    slab.setAttribute('role', 'group')
    slab.setAttribute('aria-roledescription', 'turnable layer')
    slab.setAttribute('data-i', String(i))
    slab.style.setProperty('--i', String(i))
    slab.style.setProperty('--tc-acc', ACC[i])
    const rot = el('div', 'tc-rot', slab)
    const faces: SlabFace[] = []
    for (let f = 0; f < 4; f++) {
      const face = el('div', `tc-face tc-side tc-f${f}`, rot)
      face.setAttribute('aria-hidden', 'true')
      const shade = el('i', 'tc-shade', face)
      const txt = el('div', 'tc-txt', face)
      const lab = el('span', 'tc-label', txt)
      const tech = el('span', 'tc-tech', txt)
      /* the glint runs round each slab's perimeter, cascading from the top slab down */
      for (let e = 0; e < 2; e++) {
        const edge = el('i', `tc-edge ${e ? 'tc-eb' : 'tc-et'}`, face)
        const sp = el('i', 'tc-spark', edge)
        sp.style.setProperty('--d', (-(8 - (f * 1.92 + i * 0.42 + e * 0.12)) % 8).toFixed(2))
      }
      faces.push({ el: face, shade, txt, lab, tech, m: null, c: {} })
    }
    el('div', 'tc-face tc-lid tc-top', rot).setAttribute('aria-hidden', 'true')
    el('div', 'tc-face tc-lid tc-bot', rot).setAttribute('aria-hidden', 'true')
    /* man/mv: manual spin (in quarter turns) layered on top of the scroll pose, with inertia and a spring home */
    slabs.push({ el: slab, rot, faces, a: 0, man: 0, mv: 0, c: {} })
  }
  if (reduce) rootEl.classList.add('tc-still')

  /* ---------- text fitting (measured once per font load / resize, never per frame) ---------- */
  let fits: { text: string; fit: number }[][] = []
  function measureEm(s: string): number {
    measure.textContent = s
    return measure.getBoundingClientRect().width / 100
  }
  function computeFits() {
    fits = projects.map((p) =>
      p.layers.map((l) => {
        const t = l.tech
        const w1 = measureEm(t) || 1
        const fit1 = Math.min(1, AVAIL / (TECH * w1))
        let best = { text: t, fit: fit1 }
        if (fit1 < 0.76) {
          /* try two lines, broken at the separator nearest the middle */
          const re = /\s[·+→/|&]\s|\s/g
          const cands: [number, string][] = []
          let m: RegExpExecArray | null
          while ((m = re.exec(t))) cands.push([m.index, m[0]])
          cands.forEach((c) => {
            const sep = c[1].trim()
            const a = t.slice(0, c[0]) + (sep ? ` ${sep}` : '')
            const b = t.slice(c[0] + c[1].length)
            const wm = Math.max(measureEm(a), measureEm(b)) || 1
            const f2 = Math.min(0.74, AVAIL / (TECH * wm))
            if (f2 > best.fit + 0.02) best = { text: `${a}\n${b}`, fit: f2 }
          })
        }
        return best
      }),
    )
    measure.textContent = ''
    slabs.forEach((s) => s.faces.forEach((fc) => { fc.m = null }))
  }

  /* ---------- state ---------- */
  let target = 0
  let shown = 0
  let current = -1
  let clock = 0
  let last = 0
  let raf = 0
  let visible = true
  let destroyed = false
  let sizePx = 272
  const drag = { on: false, id: -1, x: 0, y: 0, t: 0, rawY: 0, rawX: 0, slab: null as Slab | null }
  let hot: HTMLElement | null = null
  /* yaw/pitch offsets from dragging (with inertia + spring) and hovering */
  const sp = { y: 0, x: 0, vy: 0, vx: 0 }
  const hov = { y: 0, x: 0, ty: 0, tx: 0 }
  const LY = 70
  const LX = 20
  let hovRect: DOMRect | null = null
  const rigCache: Record<string, string> = {}
  const bodyCache: Record<string, string> = {}

  function slabAngle(i: number, p: number): number {
    if (reduce) return Math.round(p)
    const q = p - ZS - i * STAG
    const k = Math.floor(q)
    const t = clamp((q - k) / DUR, 0, 1)
    return k + (t >= 1 ? 1 : turnEase(t))
  }

  function writeFace(fc: SlabFace, i: number, m: number) {
    fc.m = m
    const L = m >= 0 && m < n ? projects[m].layers[i] : null
    if (!L) {
      fc.lab.textContent = ''
      fc.tech.textContent = ''
      return
    }
    const ft = fits[m] && fits[m][i] ? fits[m][i] : { text: L.tech, fit: 1 }
    fc.lab.textContent = L.label
    fc.tech.textContent = ft.text
    fc.tech.style.setProperty('--fit', ft.fit.toFixed(3))
  }

  function announce(k: number) {
    if (k === current || !n) return
    current = k
    const p = projects[clamp(k, 0, n - 1)]
    if (!p) return
    rootEl.setAttribute('aria-label', `${p.name} architecture. Drag or use the arrow keys to turn the cube.`)
    srTitle.textContent = `${p.name}, architecture from top to bottom:`
    srList.textContent = ''
    p.layers.forEach((l, li0) => {
      const li = el('li', '', srList)
      li.textContent = `${l.label}: ${l.tech}`
      if (slabs[li0]) {
        slabs[li0].el.setAttribute(
          'aria-label',
          `Layer ${li0 + 1} of ${SLABS}, ${l.label}: ${l.tech}. Left and right arrow keys turn this layer.`,
        )
      }
    })
    opts.onChange?.(k, p)
  }

  function render() {
    const sway = reduce ? 0 : 1
    const yaw = BASE_YAW + sway * (5.5 * Math.sin(clock * 0.37) + 1.5 * Math.sin(clock * 0.83)) + sp.y + hov.y
    const pitch = BASE_PITCH + sway * 1.6 * Math.sin(clock * 0.51) + sp.x + hov.x
    const bob = sway * sizePx * 0.016 * Math.sin(clock * 0.9)
    styleCache(rig, rigCache, 'transform', `rotateX(${pitch.toFixed(2)}deg) rotateY(${yaw.toFixed(2)}deg)`)
    styleCache(body, bodyCache, 'transform', `translate3d(0,${bob.toFixed(2)}px,0)`)
    const cy = Math.cos(yaw * DEG)
    const sy = Math.sin(yaw * DEG)
    const cp = Math.cos(pitch * DEG)
    const spn = Math.sin(pitch * DEG)
    for (let i = 0; i < SLABS; i++) {
      const s = slabs[i]
      const a = slabAngle(i, shown) + s.man
      s.a = a
      styleCache(s.rot, s.c, 'transform', `rotateY(${(-90 * a).toFixed(2)}deg)`)
      for (let f = 0; f < 4; f++) {
        const fc = s.faces[f]
        /* which project this face carries: the one it faces front for, switched only
           while the face points straight back (relative position -1.5 / +2.5) */
        const m = f + 4 * Math.ceil((a - 1.5 - f) / 4)
        if (m !== fc.m) writeFace(fc, i, m)
        /* normal in rig space, then rig rotation (rotateX(pitch) rotateY(yaw)) */
        const phi = 90 * (f - a) * DEG
        const nx0 = Math.sin(phi)
        const nz0 = Math.cos(phi)
        const nx = nx0 * cy + nz0 * sy
        const nz1 = -nx0 * sy + nz0 * cy
        const ny = -nz1 * spn
        const nz = nz1 * cp
        const d = Math.max(0, nx * LV[0] + ny * LV[1] + nz * LV[2])
        styleCache(fc.shade, fc.c, 'opacity', (0.62 * (1 - d)).toFixed(2))
        /* text: fades toward grazing angles, and the not-current project reads quieter */
        const facing = clamp((nz - 0.21) / 0.3, 0, 1) /* zero within ~12deg of edge-on */
        const w = 1 - Math.min(1, Math.abs(m - a))
        styleCache(fc.txt, fc.c, 'opacity', (facing * (0.42 + 0.58 * w)).toFixed(2))
      }
    }
  }

  function stepPhysics(dt: number): boolean {
    let busy = false
    if (!drag.on) {
      const K = reduce ? 60 : 30
      const C = reduce ? 2 * Math.sqrt(60) : 5.6
      sp.vy += (-K * sp.y - C * sp.vy) * dt
      sp.y += sp.vy * dt
      sp.vx += (-K * sp.x - C * sp.vx) * dt
      sp.x += sp.vx * dt
      if (Math.abs(sp.y) + Math.abs(sp.x) + Math.abs(sp.vy) + Math.abs(sp.vx) < 0.02) {
        sp.y = sp.x = sp.vy = sp.vx = 0
      } else busy = true
    } else busy = true
    for (let si = 0; si < SLABS; si++) {
      const sl = slabs[si]
      if (drag.on && drag.slab === sl) {
        busy = true
        continue
      }
      if (sl.man === 0 && sl.mv === 0) continue
      const wasTurning = Math.abs(sl.man) > 2e-3 || Math.abs(sl.mv) > 2e-3
      /* coast on the fling, then spring back to the scroll pose (scroll always wins) */
      const Ks = reduce ? 90 : 16
      const Cs = reduce ? 2 * Math.sqrt(90) : 4.6
      sl.mv += (-Ks * sl.man - Cs * sl.mv) * dt
      sl.man += sl.mv * dt
      if (Math.abs(sl.man) + Math.abs(sl.mv) < 2e-3) {
        sl.man = 0
        sl.mv = 0
        if (wasTurning) opts.onPulse?.('turn')
      } else busy = true
    }
    const kh = 1 - Math.exp(-dt / 0.28)
    hov.y += (hov.ty - hov.y) * kh
    hov.x += (hov.tx - hov.x) * kh
    if (Math.abs(hov.ty - hov.y) + Math.abs(hov.tx - hov.x) > 0.01) busy = true
    const ks = reduce || !smoothing ? 1 : 1 - Math.exp(-dt / smoothing)
    shown += (target - shown) * ks
    if (Math.abs(target - shown) < 1e-4) shown = target
    else busy = true
    return busy
  }

  function frame(now: number) {
    raf = 0
    if (destroyed) return
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60
    last = now
    if (!reduce) clock += dt
    const busy = stepPhysics(dt)
    render()
    /* idle life keeps the loop running; with reduced motion it sleeps once settled */
    if (visible && (!reduce || busy)) raf = requestAnimationFrame(frame)
    else last = 0
  }
  function wake() {
    if (!raf && !destroyed && visible) {
      last = 0
      raf = requestAnimationFrame(frame)
    }
  }

  /* ---------- pointer: drag with inertia + spring back; hover tilt ---------- */
  function atanhc(v: number): number {
    v = clamp(v, -0.995, 0.995)
    return 0.5 * Math.log((1 + v) / (1 - v))
  }
  function onDown(e: PointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const target0 = e.target as HTMLElement | null
    const se = target0 && target0.closest ? (target0.closest('.tc-slab') as HTMLElement | null) : null
    drag.slab = se ? slabs[+(se.getAttribute('data-i') || 0)] : null
    drag.on = true
    drag.id = e.pointerId
    drag.x = e.clientX
    drag.y = e.clientY
    drag.t = performance.now()
    opts.onPulse?.('drag')
    if (drag.slab) {
      drag.slab.mv = 0
      try {
        rootEl.setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      rootEl.classList.add('is-dragging')
      wake()
      return
    }
    drag.rawY = LY * atanhc(sp.y / LY)
    drag.rawX = LX * atanhc(sp.x / LX)
    sp.vy = sp.vx = 0
    try {
      rootEl.setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    rootEl.classList.add('is-dragging')
    wake()
  }
  function onMove(e: PointerEvent) {
    if (drag.on && e.pointerId === drag.id && drag.slab) {
      const nw = performance.now()
      const dts = Math.max(0.001, (nw - drag.t) / 1000)
      const dq = -(e.clientX - drag.x) / (sizePx * 0.95)
      drag.slab.man += dq
      drag.slab.mv = drag.slab.mv * 0.5 + (dq / dts) * 0.5
      drag.x = e.clientX
      drag.y = e.clientY
      drag.t = nw
      wake()
      return
    }
    if (e.pointerType === 'mouse' && !drag.on) {
      const target0 = e.target as HTMLElement | null
      const he = target0 && target0.closest ? (target0.closest('.tc-slab') as HTMLElement | null) : null
      if (he !== hot) {
        if (hot) hot.classList.remove('is-hot')
        hot = he
        if (hot) hot.classList.add('is-hot')
      }
    }
    if (drag.on && e.pointerId === drag.id) {
      const now = performance.now()
      const dt = Math.max(0.001, (now - drag.t) / 1000)
      drag.rawY += (e.clientX - drag.x) * 0.5
      drag.rawX += -(e.clientY - drag.y) * 0.28
      drag.x = e.clientX
      drag.y = e.clientY
      drag.t = now
      const ny = LY * Math.tanh(drag.rawY / LY)
      const nx = LX * Math.tanh(drag.rawX / LX)
      const vy = (ny - sp.y) / dt
      const vx = (nx - sp.x) / dt
      sp.vy = sp.vy * 0.6 + vy * 0.4
      sp.vx = sp.vx * 0.6 + vx * 0.4
      sp.y = ny
      sp.x = nx
      wake()
    } else if (e.pointerType === 'mouse' && !drag.on) {
      const r = hovRect || (hovRect = rootEl.getBoundingClientRect())
      const hx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1)
      const hy = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1)
      hov.ty = hx * 7
      hov.tx = -hy * 5
      wake()
    }
  }
  function onUp(e: PointerEvent) {
    if (!drag.on || e.pointerId !== drag.id) return
    drag.on = false
    if (drag.slab) {
      if (performance.now() - drag.t > 90) drag.slab.mv = 0
      drag.slab.mv = clamp(drag.slab.mv, -7, 7)
      drag.slab = null
      rootEl.classList.remove('is-dragging')
      try {
        rootEl.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      wake()
      return
    }
    /* no movement in the last 90ms means the pointer stopped: no fling */
    if (performance.now() - drag.t > 90) {
      sp.vy = sp.vx = 0
    }
    sp.vy = clamp(sp.vy, -420, 420)
    sp.vx = clamp(sp.vx, -160, 160)
    rootEl.classList.remove('is-dragging')
    try {
      rootEl.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    wake()
  }
  function onLeave(e: PointerEvent) {
    hovRect = null
    if (hot) {
      hot.classList.remove('is-hot')
      hot = null
    }
    if (e.pointerType === 'mouse') {
      hov.ty = hov.tx = 0
      wake()
    }
  }
  function onEnter(e: PointerEvent) {
    hovRect = null
    if (e.pointerType === 'mouse') opts.onPulse?.('hover')
  }
  function onFocusIn() {
    opts.onPulse?.('hover')
  }
  function onKey(e: KeyboardEvent) {
    const k = e.key
    let hit = true
    const t = e.target as HTMLElement | null
    const fs = t && t.classList && t.classList.contains('tc-slab') ? slabs[+(t.getAttribute('data-i') || 0)] : null
    if (fs && (k === 'ArrowLeft' || k === 'ArrowRight')) {
      fs.mv += k === 'ArrowLeft' ? 3.4 : -3.4
      e.preventDefault()
      wake()
      return
    }
    if (k === 'ArrowLeft') sp.vy -= 160
    else if (k === 'ArrowRight') sp.vy += 160
    else if (k === 'ArrowUp') sp.vx += 70
    else if (k === 'ArrowDown') sp.vx -= 70
    else hit = false
    if (hit) {
      e.preventDefault()
      wake()
    }
  }
  rootEl.addEventListener('pointerdown', onDown)
  rootEl.addEventListener('pointermove', onMove)
  rootEl.addEventListener('pointerup', onUp)
  rootEl.addEventListener('pointercancel', onUp)
  rootEl.addEventListener('pointerleave', onLeave)
  rootEl.addEventListener('pointerenter', onEnter)
  rootEl.addEventListener('focusin', onFocusIn)
  rootEl.addEventListener('keydown', onKey)

  /* ---------- visibility, motion preference, fonts ---------- */
  let io: IntersectionObserver | null = null
  if (typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver(
      (en) => {
        visible = en[en.length - 1].isIntersecting
        if (visible) wake()
      },
      { rootMargin: '120px' },
    )
    io.observe(rootEl)
  }
  function onReduce() {
    if (reduceLocked) return
    reduce = mqReduce.matches
    rootEl.classList.toggle('tc-still', reduce)
    wake()
  }
  if ('addEventListener' in mqReduce) mqReduce.addEventListener('change', onReduce)

  function resize() {
    if (fit) {
      const r = container.getBoundingClientRect()
      const s = Math.max(80, Math.min(r.width / 1.62, (r.height || r.width) / 1.62))
      rootEl.style.setProperty('--tc-size', `${s.toFixed(1)}px`)
    }
    const probe = el('i', '', rootEl)
    probe.style.cssText = 'position:absolute;visibility:hidden;width:var(--tc-size);height:0'
    sizePx = probe.getBoundingClientRect().width || sizePx
    rootEl.removeChild(probe)
    computeFits()
    render()
  }
  let rt: ReturnType<typeof setTimeout> | undefined
  function onWinResize() {
    clearTimeout(rt)
    rt = setTimeout(resize, 120)
  }
  function onScroll() {
    hovRect = null
  }
  window.addEventListener('resize', onWinResize)
  window.addEventListener('scroll', onScroll, { passive: true })
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      if (!destroyed) resize()
    })
  }

  /* ---------- public API ---------- */
  function setProgress(p: number, o?: { immediate?: boolean }) {
    p = +p
    if (!isFinite(p)) return
    target = clamp(p, 0, Math.max(0, n - 1))
    if ((o && o.immediate) || reduce) shown = target
    announce(Math.round(target))
    wake()
  }
  function setTint(tint: string | null) {
    if (tint) rootEl.style.setProperty('--tc-tint', tint)
    else rootEl.style.removeProperty('--tc-tint')
  }
  function setReducedMotion(v: boolean) {
    reduceLocked = true
    reduce = v
    rootEl.classList.toggle('tc-still', reduce)
    wake()
  }
  function destroy() {
    destroyed = true
    if (raf) cancelAnimationFrame(raf)
    if (io) io.disconnect()
    window.removeEventListener('resize', onWinResize)
    window.removeEventListener('scroll', onScroll)
    if ('removeEventListener' in mqReduce) mqReduce.removeEventListener('change', onReduce)
    rootEl.removeEventListener('pointerdown', onDown)
    rootEl.removeEventListener('pointermove', onMove)
    rootEl.removeEventListener('pointerup', onUp)
    rootEl.removeEventListener('pointercancel', onUp)
    rootEl.removeEventListener('pointerleave', onLeave)
    rootEl.removeEventListener('pointerenter', onEnter)
    rootEl.removeEventListener('focusin', onFocusIn)
    rootEl.removeEventListener('keydown', onKey)
    clearTimeout(rt)
    while (rootEl.firstChild) rootEl.removeChild(rootEl.firstChild)
    rootEl.classList.remove('tc-root', 'tc-fit', 'tc-still', 'is-dragging')
    rootEl.removeAttribute('role')
    rootEl.removeAttribute('aria-roledescription')
    rootEl.removeAttribute('aria-label')
    rootEl.removeAttribute('tabindex')
  }

  resize()
  setProgress(opts.progress || 0, { immediate: true })
  render()
  wake()

  return {
    el: rootEl,
    setProgress,
    getProgress: () => target,
    getIndex: () => current,
    resize,
    setTint,
    setReducedMotion,
    destroy,
  }
}
