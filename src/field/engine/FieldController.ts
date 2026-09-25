/**
 * FieldController: the driver between the page and the field.
 *
 *  - discovers stops ([data-field-stop]) and keeps them current: a MutationObserver catches stops
 *    added/removed/changed (route changes, async data), a ResizeObserver catches layout shifts;
 *  - maps (smoothed) scroll to progress and notifies subscribers;
 *  - writes the page gradient variables on <html>;
 *  - couples hover/focus on [data-field-hover|cluster|ring] to the shapes;
 *  - owns Lenis (smoothScroll.ts) and the WebGL engine, and falls back to a static page when
 *    reduced motion is requested or WebGL2 is unavailable.
 *
 * Constructing it has no side effects; start()/stop() are symmetric and may be repeated
 * (React StrictMode mounts effects twice).
 */
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type * as THREE from 'three'
import type { FieldApi } from '../contract'
import { createSmoothScroll, type SmoothScroll } from '../smoothScroll'
import { BgVarWriter, mixRgb } from './colors'
import { FieldEngine } from './FieldEngine'
import { clamp, lerp, smooth } from './math'
import { SHAPES } from './shapes'
import { locate, measureStops, readStops, readViewport, stopsSignature, type StopGeom, type StopSpec, type ViewportInfo } from './stops'

export interface FieldControllerOptions {
  /** Selector for the fixed nav whose height offsets anchor scrolling. */
  navSelector?: string
  /** Set false to skip Lenis (native scrolling). Default true. */
  smoothScroll?: boolean
}

const HOVER_SEL = '[data-field-hover], [data-field-cluster], [data-field-ring]'
const WATCHED_ATTRS = ['data-field-stop', 'data-shape', 'data-side', 'data-tint', 'data-cluster-sizes', 'data-rings', 'data-bg', 'data-field-cluster', 'data-field-ring']
/**
 * Time constant (s) of the field's catch-up to the scroll position. Lenis already eases the page,
 * so this only irons out wheel steps; a longer one leaves the shape behind the text it belongs to.
 */
const FOLLOW = 0.08
/**
 * Stretch of the scroll between two stops (0..1) over which the shape morphs. The next section's
 * text arrives where the current shape sits, so the shape has to leave before that text is read.
 */
const MORPH_FROM = 0.2
const MORPH_TO = 0.75
/** CSS variables written on side stops for their caption (see ProjectPanel). */
const CAPTION_VARS = ['--shape-cx', '--shape-bottom'] as const

function probeWebGL2(): boolean {
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2')
    if (!gl) return false
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

export class FieldController {
  readonly api: FieldApi
  private readonly opts: FieldControllerOptions
  private started = false
  private gen = 0
  private staticMode: boolean | null = null
  private host: HTMLElement | null = null
  private engine: FieldEngine | null = null
  private smooth: SmoothScroll | null = null
  private bg: BgVarWriter | null = null

  private specs: StopSpec[] = []
  private stopEls: Element[] = []
  private geoms: StopGeom[] = []
  private sig = ''
  private vp: ViewportInfo = { w: 1, h: 1, mobile: false, tablet: false, maxScroll: 0 }

  private listeners = new Set<(p: number) => void>()
  private p = 0
  private emitted = NaN
  private sp = 0
  private spT = 0
  private snap = true
  private raf = 0
  private hidden = false
  private timers = new Map<string, number>()
  private mo: MutationObserver | null = null
  private ro: ResizeObserver | null = null

  private hov = { stage: -1, group: 0, pulse: 0, on: false, amt: 0 }
  private turn = { stage: -1, t: -99, amp: 0.75 }
  private ring = { stage: -1, g: 0, amt: 0 }
  private now = 0
  private refreshingST = false

  constructor(opts: FieldControllerOptions = {}) {
    this.opts = opts
    const isStatic = (): boolean => this.isStatic
    this.api = {
      getProgress: () => this.p,
      onProgress: (cb) => {
        this.listeners.add(cb)
        return () => {
          this.listeners.delete(cb)
        }
      },
      stopIndex: (key) => this.specs.findIndex((s) => s.key === key),
      pulse: (key, strength = 1) => {
        const k = this.specs.findIndex((s) => s.key === key)
        if (k < 0) return
        this.turn = { stage: k, t: this.now || performance.now() / 1000, amp: 0.75 * strength }
      },
      scrollTo: (target, o) => this.scrollTo(target, o),
      refresh: () => this.schedule('refresh', 0, () => this.rebuild(true)),
      get isStatic() {
        return isStatic()
      },
    }
  }

  /** WebGL2 unavailable, reduced motion, or the GL context was lost. */
  get isStatic(): boolean {
    if (this.staticMode === null) {
      if (typeof window === 'undefined') return true
      const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      this.staticMode = reduced || !probeWebGL2()
    }
    return this.staticMode
  }

  /** FieldCanvas registers its host element here; returns the detach function. */
  attachHost = (el: HTMLElement): (() => void) => {
    this.host = el
    if (this.started && !this.isStatic && !this.engine) this.createEngine()
    return () => {
      if (this.host !== el) return
      this.destroyEngine()
      this.host = null
    }
  }

  start(): void {
    if (this.started || typeof window === 'undefined') return
    this.started = true
    const gen = ++this.gen
    const isStatic = this.isStatic
    document.documentElement.classList.toggle('static', isStatic)
    gsap.registerPlugin(ScrollTrigger)
    this.bg = new BgVarWriter()
    this.smooth = createSmoothScroll({ smooth: !isStatic && this.opts.smoothScroll !== false, navSelector: this.opts.navSelector })
    ScrollTrigger.addEventListener('refresh', this.onSTRefresh)
    window.addEventListener('resize', this.onResize)
    window.addEventListener('scroll', this.onScroll, { passive: true })
    document.addEventListener('visibilitychange', this.onVisibility)
    document.addEventListener('pointerover', this.onPointerOver)
    document.addEventListener('pointerout', this.onPointerOut)
    document.addEventListener('focusin', this.onFocusIn)
    document.addEventListener('focusout', this.onFocusOut)
    this.hidden = document.visibilityState === 'hidden'

    this.mo = new MutationObserver((muts) => {
      // stop elements swapped (route change): rebuild now, before the next frame renders the
      // old stops against the new scroll position; anything else is debounced
      const els = document.querySelectorAll('[data-field-stop]')
      if (els.length !== this.stopEls.length || Array.from(els).some((e, k) => e !== this.stopEls[k])) {
        this.rebuild(false)
        return
      }
      for (const m of muts) {
        if (m.type === 'attributes' || Array.from(m.addedNodes).some((n) => n.nodeType === 1) || Array.from(m.removedNodes).some((n) => n.nodeType === 1)) {
          this.schedule('rebuild', 60, () => this.rebuild(false))
          return
        }
      }
    })
    this.mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: WATCHED_ATTRS })
    if (typeof ResizeObserver !== 'undefined') this.ro = new ResizeObserver(() => this.schedule('layout', 100, () => this.layout(false)))

    // the "@" is sampled from the web font: rebuild once it has loaded
    const fonts = document.fonts
    if (fonts?.ready) {
      fonts.ready
        .then(() => fonts.load('700 330px Manrope').catch(() => []))
        .then(() => {
          if (gen !== this.gen || !this.started) return
          this.engine?.fontsChanged()
          this.layout(false)
        })
        .catch(() => {})
    }

    this.snap = true
    this.rebuild(true)
    if (this.host && !isStatic) this.createEngine()
    this.requestTick()
  }

  stop(): void {
    if (!this.started) return
    this.started = false
    this.gen++
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
    for (const id of this.timers.values()) clearTimeout(id)
    this.timers.clear()
    this.mo?.disconnect()
    this.ro?.disconnect()
    this.mo = null
    this.ro = null
    ScrollTrigger.removeEventListener('refresh', this.onSTRefresh)
    window.removeEventListener('resize', this.onResize)
    window.removeEventListener('scroll', this.onScroll)
    document.removeEventListener('visibilitychange', this.onVisibility)
    document.removeEventListener('pointerover', this.onPointerOver)
    document.removeEventListener('pointerout', this.onPointerOut)
    document.removeEventListener('focusin', this.onFocusIn)
    document.removeEventListener('focusout', this.onFocusOut)
    this.destroyEngine()
    this.writeCaptionVars()
    this.smooth?.destroy()
    this.smooth = null
    this.bg?.clear()
    this.bg = null
    document.documentElement.classList.remove('static')
    this.specs = []
    this.stopEls = []
    this.geoms = []
    this.sig = ''
    this.emitted = NaN
  }

  /* ---------- engine lifecycle ---------- */

  private createEngine(): void {
    if (!this.host || this.engine) return
    try {
      this.engine = new FieldEngine(this.host, { onContextLost: this.onContextLost })
    } catch {
      this.engine = null
      this.goStatic()
      return
    }
    this.engine.setStops(this.specs, this.geoms, this.vp, false)
    this.writeCaptionVars()
    this.snap = true
    this.requestTick()
  }

  private destroyEngine(lost = false): void {
    if (!this.engine) return
    this.engine.dispose(lost)
    this.engine = null
  }

  private onContextLost = (): void => {
    this.destroyEngine(true)
    this.writeCaptionVars()
    this.goStatic()
  }

  private goStatic(): void {
    this.staticMode = true
    document.documentElement.classList.add('static')
    this.requestTick()
  }

  /* ---------- stops ---------- */

  private schedule(name: string, ms: number, fn: () => void): void {
    if (!this.started) return
    if (this.timers.has(name)) return
    this.timers.set(name, window.setTimeout(() => {
      this.timers.delete(name)
      if (this.started) fn()
    }, ms))
  }

  private rebuild(force: boolean): void {
    if (!this.started) return
    this.stopEls = Array.from(document.querySelectorAll('[data-field-stop]'))
    const specs = readStops()
    const sig = stopsSignature(specs)
    const changed = sig !== this.sig
    if (!changed && !force) return
    const old = this.specs
    // a wholesale swap of stop elements (route change) morphs the old page's shape into the new one
    const pageChanged = changed && old.length > 0 && specs.length > 0 && !specs.some((s) => old.some((o) => o.el === s.el))
    this.specs = specs
    this.sig = sig
    if (changed) {
      // stop indices moved: forget hover/pulse targets, re-observe sizes
      this.hov.on = false
      this.hov.amt = 0
      this.hov.stage = -1
      this.turn.stage = -1
      if (this.ro) {
        this.ro.disconnect()
        this.ro.observe(document.body)
        for (const s of specs) this.ro.observe(s.el)
      }
    }
    if (pageChanged) this.snap = true
    // other scroll-driven pieces need to know the page changed length (and may pin/unpin)
    if (changed && !this.isStatic) {
      this.refreshingST = true
      try {
        ScrollTrigger.refresh()
      } finally {
        this.refreshingST = false
      }
    }
    this.layout(pageChanged)
  }

  private layout(pageChanged: boolean): void {
    if (!this.started) return
    this.vp = readViewport()
    this.geoms = measureStops(this.specs, this.vp)
    this.engine?.setStops(this.specs, this.geoms, this.vp, pageChanged)
    this.writeCaptionVars()
    this.requestTick()
  }

  /**
   * Captions sit under their shape: each side stop gets its shape's rest box as CSS variables.
   * Without the engine (static page) the variables are removed and the CSS defaults apply.
   */
  private writeCaptionVars(): void {
    const boxes = this.engine?.restBoxes() ?? []
    this.specs.forEach((s, k) => {
      const b = boxes[k]
      const st = s.el.style
      if (b) {
        st.setProperty('--shape-cx', `${b.cx.toFixed(1)}px`)
        st.setProperty('--shape-bottom', `${b.bottom.toFixed(1)}px`)
      } else for (const v of CAPTION_VARS) st.removeProperty(v)
    })
  }

  /* ---------- scrolling ---------- */

  private scrollTo(target: string | HTMLElement, o?: { offset?: number; duration?: number }): void {
    const opts = { offset: o?.offset, duration: o?.duration, immediate: this.isStatic }
    if (this.smooth) this.smooth.scrollTo(target, opts)
    else {
      const el = typeof target === 'string' ? document.getElementById(target.replace(/^\/?#/, '')) : target
      if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - (o?.offset ?? 0)), behavior: 'auto' })
    }
  }

  /** Exponential follow of the scroll position, independent of the frame rate. */
  private scrub(target: number, t: number): number {
    const dt = clamp(t - this.spT, 0, 0.1)
    this.spT = t
    if (this.snap) {
      this.snap = false
      this.sp = target
      return target
    }
    this.sp += (target - this.sp) * (1 - Math.exp(-dt / FOLLOW))
    if (Math.abs(target - this.sp) < 0.5) this.sp = target
    return this.sp
  }

  /* ---------- frame loop ---------- */

  private requestTick(): void {
    if (!this.started || this.raf || this.hidden) return
    this.raf = requestAnimationFrame(this.loop)
  }

  private loop = (now: number): void => {
    this.raf = 0
    if (!this.started) return
    // the canvas has idle motion: keep running while visible; the static page only ticks on scroll/resize
    if (this.engine && !this.hidden) this.raf = requestAnimationFrame(this.loop)
    this.tick(now)
  }

  private tick(now: number): void {
    const t = now / 1000
    this.now = t
    const sy = window.scrollY
    let sp = sy
    if (this.engine) sp = this.scrub(sy, t)
    else this.snap = false
    const n = this.specs.length
    const { i, f } = locate(this.geoms, sp)
    const p = n ? i + f : 0
    this.p = p
    if (!(Math.abs(p - this.emitted) < 1e-5)) {
      this.emitted = p
      for (const cb of this.listeners) {
        try {
          cb(p)
        } catch (err) {
          // a failing subscriber must not stop the field; report it asynchronously
          queueMicrotask(() => {
            throw err
          })
        }
      }
    }
    const T = smooth(MORPH_FROM, MORPH_TO, f)

    /* page gradient variables */
    if (n && this.bg) {
      const A = this.specs[i]
      const B = this.specs[Math.min(i + 1, n - 1)]
      const tt = A === B ? 0 : T
      const sw = (A.shape === 'clusters' ? 1 - tt : 0) + (B !== A && B.shape === 'clusters' ? tt : 0)
      this.bg.write(mixRgb(A.bg[0], B.bg[0], tt), mixRgb(A.bg[1], B.bg[1], tt), 1 - clamp(sw, 0, 1) * 0.85)
    }

    if (!this.engine) return

    /* the timeline entry nearest mid-viewport lights its ring */
    this.ring.stage = -1
    for (let k = 0; k < n; k++) {
      const g = this.geoms[k]
      if (SHAPES[this.specs[k].shape].layout !== 'helix' || !g.rings.length) continue
      const mid = sy + this.vp.h / 2
      let best = g.rings[0]
      for (const r of g.rings) if (Math.abs(r.y - mid) < Math.abs(best.y - mid)) best = r
      if (best.n !== this.ring.g) {
        this.ring.g = best.n
        this.ring.amt = 0.2
      }
      this.ring.amt = lerp(this.ring.amt, 0.8, 0.08)
      this.ring.stage = k
      break
    }
    this.hov.amt = lerp(this.hov.amt, this.hov.on ? 1 : 0, 0.12)
    this.engine.frame({ time: t, i, T, sy, fx: this.fxFor })
  }

  /** DOM coupling: hovered title pulses its shape; skill group lights its cluster; timeline entry its ring. */
  private fxFor = (k: number, out: THREE.Vector3): void => {
    const h = this.hov
    if (k === h.stage && h.amt > 1e-3) out.set(h.pulse * h.amt, h.group, h.group ? h.amt : 0)
    else if (k === this.ring.stage && this.ring.g) out.set(0, this.ring.g, this.ring.amt)
    else out.set(0, 0, 0)
    if (k === this.turn.stage) {
      const tp = this.turn.amp * Math.exp(-(this.now - this.turn.t) * 2.2)
      if (tp > out.x) out.x = tp
    }
  }

  /* ---------- hover coupling ---------- */

  private setHover(target: EventTarget | null): void {
    const el = target instanceof Element ? target.closest<HTMLElement>(HOVER_SEL) : null
    if (!el) {
      this.hov.on = false
      return
    }
    const d = el.dataset
    const stopOf = (layout: string): number => {
      const own = el.closest('[data-field-stop]')
      const k = own ? this.specs.findIndex((s) => s.el === own) : -1
      if (k >= 0 && SHAPES[this.specs[k].shape].layout === layout) return k
      return this.specs.findIndex((s) => SHAPES[s.shape].layout === layout)
    }
    let stage = -1
    let group = 0
    let pulse = 0
    if (d.fieldHover !== undefined) {
      stage = this.specs.findIndex((s) => s.key === d.fieldHover)
      pulse = 1
    } else if (d.fieldCluster !== undefined) {
      stage = stopOf('clusters')
      group = parseInt(d.fieldCluster, 10) || 0
    } else if (d.fieldRing !== undefined) {
      stage = stopOf('helix')
      group = parseInt(d.fieldRing, 10) || 0
    }
    if (stage < 0) {
      this.hov.on = false
      return
    }
    this.hov.stage = stage
    this.hov.group = group
    this.hov.pulse = pulse
    this.hov.on = true
  }

  private onPointerOver = (e: PointerEvent): void => this.setHover(e.target)
  private onPointerOut = (e: PointerEvent): void => {
    if (!e.relatedTarget) this.hov.on = false
  }
  private onFocusIn = (e: FocusEvent): void => this.setHover(e.target)
  private onFocusOut = (e: FocusEvent): void => {
    if (!e.relatedTarget) this.hov.on = false
  }

  /* ---------- window events ---------- */

  private onResize = (): void => {
    this.engine?.resize()
    this.schedule('layout', 150, () => this.layout(false))
    this.requestTick()
  }

  private onScroll = (): void => {
    if (!this.engine) this.requestTick()
  }

  private onSTRefresh = (): void => {
    if (!this.refreshingST) this.schedule('layout', 0, () => this.layout(false))
  }

  private onVisibility = (): void => {
    this.hidden = document.visibilityState === 'hidden'
    if (this.hidden) {
      if (this.raf) cancelAnimationFrame(this.raf)
      this.raf = 0
    } else this.requestTick()
  }
}
