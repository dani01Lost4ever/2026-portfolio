/**
 * Take — the film engine. React mounts it into an empty element and never touches its DOM.
 *
 * Scroll is the film's clock: 1 beat = BEAT_PX of page scroll. Wheel input moves a goal and
 * the film glides to it; when input stops between two rest frames the film plays on to the
 * end of that piece at film speed, or rewinds to its start if it had barely begun. Touch and
 * the scrollbar stay native. Space plays the whole take at 120 BPM; arrows jump rest to rest.
 */

import { buildEls, type Els } from './build'
import type { TakeContent } from './content'
import { computeLayout, type Lay } from './layout'
import { clamp, eio, lerp, SPB } from './math'
import { seek, tile0Screen } from './scenes'
import { CASE_BEAT, CHAPTERS, RESTS, T_END } from './timeline'
import type { ChapterId } from '../TakeContext'

export interface TakeOptions {
  content: TakeContent
  /** Beat to open on (e.g. to keep the position when content reloads). */
  startBeat?: number
  /** Hold that frame (no snap) until the first input: for a deep link that lands mid-piece. */
  holdStart?: boolean
  /** Keep playing: the take was playing when the engine was rebuilt. */
  startPlaying?: boolean
  /** Start paused: a sheet is open over the film. */
  startPaused?: boolean
  /** A tile or the "all projects" button was clicked; `index` is into content.projects. */
  onOpenProject(index: number, from: DOMRect): void
  onOpenContact(from: DOMRect): void
  /** An in-app link inside the film (e.g. the full case study). */
  onNavigate(path: string): void
  onChapter?(id: ChapterId): void
}

const SNAP_FWD = 0.35, SNAP_RATE = 2.2, REWIND_RATE = 3.4, WHEEL_TAU = 0.2

export class Take {
  readonly root: HTMLElement
  readonly c: TakeContent
  readonly opts: TakeOptions
  readonly E: Els
  L: Lay
  clickable: boolean | undefined = undefined
  chapter = -1

  private tT = 0
  private goal = 0
  private playing = false
  private tween: { from: number; to: number; t0: number; dur: number } | null = null
  private snap: { to: number } | null = null
  private src: 'virtual' | 'native' = 'virtual'
  private hold = false
  private paused = false
  private last = performance.now()
  private lastInput = 0
  private lastDir = 1
  private touching = false
  private ownY = -1
  private lastT = -1
  private raf = 0
  private resizeTimer = 0
  private clockStr = ''
  private readonly prevRestoration = history.scrollRestoration
  private readonly off: (() => void)[] = []
  private readonly fmtTime = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Rome' })
  private readonly fmtDate = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome' })

  constructor(root: HTMLElement, opts: TakeOptions) {
    this.root = root
    this.opts = opts
    this.c = opts.content
    root.classList.add('take')
    this.E = buildEls(this)
    if (!this.c.projects.length) this.E.projectsBtn.hidden = true
    this.L = computeLayout(this)
    this.bind()
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    this.tT = this.goal = clamp(opts.startBeat ?? 0, 0, T_END - 0.001)
    this.hold = !!opts.holdStart
    this.paused = !!opts.startPaused
    if (opts.startPlaying) this.setPlaying(true)
    this.writeScroll(true)
    seek(this, this.tT)
    this.lastT = this.tT
    this.rasterBackdrop()
    this.raf = requestAnimationFrame(this.frame)
  }

  /** The glass word's poster texture, at the size the poster has once the camera has zoomed in. */
  private rasterBackdrop() {
    const gl = this.E.wordGL, lead = this.c.projects[0]
    if (!gl || !lead || !this.L.wordGL) return
    const T = tile0Screen(this, 22)
    gl.backdrop(lead.sym, Math.max(T.w, T.h) * Math.min(2, window.devicePixelRatio || 1)).then(() => { this.lastT = -1 })
  }

  // ─── public API ──────────────────────────────────────────────────────────────

  get beat() { return this.tT }
  get isPlaying() { return this.playing }

  goToChapter(id: ChapterId) {
    const ch = CHAPTERS.find(c => c.id === id)
    if (ch) this.goTo(ch.beat)
  }

  /** Freeze input (a sheet or dialog is open above the film). */
  pause(on: boolean) {
    this.paused = on
    if (on) this.stopAuto()
    else { this.goal = this.tT; this.writeScroll(true) }
  }

  /** Where a sheet should fold back to: that project's tile while the bento rests, else a button on screen. */
  projectRect(index: number): DOMRect {
    const t = this.E.tiles[index]
    if (this.clickable) return (t ? t.el : this.E.allBtn).getBoundingClientRect()
    return this.E.projectsBtn.getBoundingClientRect()
  }

  contactRect(): DOMRect { return this.E.plBtn.getBoundingClientRect() }

  playToCase() { this.snapTo(CASE_BEAT) }

  /** For reviewing single frames: holds that frame until the next input. */
  seekFrame(b: number) {
    this.stopAuto(); this.hold = true
    this.tT = this.goal = b
    this.writeScroll(true); seek(this, b); this.lastT = b
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    clearTimeout(this.resizeTimer)
    this.off.forEach(f => f())
    this.off.length = 0
    this.E.wordGL?.destroy()
    this.E.wipeRect?.setAttribute('width', '0')
    this.E.wipeLine?.setAttribute('x', '-4')
    this.root.replaceChildren()
    this.root.classList.remove('take')
    history.scrollRestoration = this.prevRestoration
  }

  // ─── used by the scenes ────────────────────────────────────────────────────────

  clock(): string {
    const s = this.fmtTime.format(new Date())
    if (s !== this.clockStr) this.clockStr = s
    return this.clockStr
  }

  date(): string { return this.fmtDate.format(new Date()) }

  // ─── motion ─────────────────────────────────────────────────────────────────────

  private setPlaying(v: boolean) {
    this.playing = v; this.tween = null; this.snap = null
    const b = this.E.play
    b.setAttribute('aria-pressed', String(v))
    ;(b.querySelector('span') as HTMLSpanElement).textContent = v ? 'Pause' : 'Play the take'
    b.querySelector('path')?.setAttribute('d', v ? 'M1 .5h3v9H1zM6 .5h3v9H6z' : 'M1 0.5v9l8-4.5z')
  }

  private stopAuto() { if (this.playing) this.setPlaying(false); this.tween = null; this.snap = null; this.hold = false }

  private goTo(b: number) { this.stopAuto(); this.tween = { from: this.tT, to: b, t0: performance.now(), dur: 900 + Math.abs(b - this.tT) * 12 } }

  private snapTo(b: number) { this.stopAuto(); this.snap = { to: b }; this.src = 'virtual' }

  private restFrom(t: number, dir: number): number {
    if (dir > 0) return RESTS.find(r => r > t + 0.02) ?? T_END
    for (let i = RESTS.length - 1; i >= 0; i--) if (RESTS[i] < t - 0.02) return RESTS[i]
    return 0
  }

  private snapTarget(t: number, dir: number): number | null {
    for (let i = 0; i < RESTS.length - 1; i++) {
      const a = RESTS[i], b = RESTS[i + 1]
      if (t < a - 0.001 || t > b + 0.001) continue
      if (t - a < 0.02 || b - t < 0.02) return null
      const p = (t - a) / (b - a)
      return dir >= 0 ? (p >= SNAP_FWD ? b : a) : (p <= 1 - SNAP_FWD ? a : b)
    }
    return null
  }

  private writeScroll(force = false) {
    const y = Math.round(this.tT * this.L.BEAT_PX)
    if (force || Math.abs(window.scrollY - y) > 1) { this.ownY = y; window.scrollTo(0, y) }
  }

  private frame = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    if (!this.paused) {
      if (this.tween) {
        const q = clamp((now - this.tween.t0) / this.tween.dur)
        this.tT = this.goal = lerp(this.tween.from, this.tween.to, eio(q))
        if (q >= 1) { this.tween = null; this.src = 'virtual' }
      } else if (this.playing) this.tT = this.goal = this.tT + dt / SPB
      else if (this.snap) {
        const rem = this.snap.to - this.tT, dir = Math.sign(rem)
        const v = (dir > 0 ? SNAP_RATE : REWIND_RATE) * Math.min(1, 0.3 + Math.abs(rem) / 0.5)
        if (Math.abs(rem) <= v * dt) { this.tT = this.goal = this.snap.to; this.snap = null }
        else this.tT = this.goal = this.tT + dir * v * dt
      } else {
        this.tT += (this.goal - this.tT) * (1 - Math.exp(-dt / (this.src === 'native' ? 0.06 : WHEEL_TAU)))
        if (Math.abs(this.goal - this.tT) < 1e-4) this.tT = this.goal
        const idle = now - this.lastInput > (this.src === 'native' ? 240 : 170)
        if (!this.hold && !this.touching && idle && Math.abs(this.goal - this.tT) < 0.03) {
          const to = this.snapTarget(this.tT, this.lastDir)
          if (to != null) this.snap = { to }
        }
      }
      // last frame = first frame, so the take loops without a seam
      if (this.tT >= T_END) {
        this.tT -= T_END; this.goal -= T_END
        if (this.snap) { this.snap.to -= T_END; if (this.snap.to <= this.tT + 1e-6) this.snap = null }
      }
      if (this.src === 'virtual' || this.playing || this.tween || this.snap) this.writeScroll()
    }
    const t = this.tT
    const ambient = t >= 61.2 && t < 68.6
    const minute = t >= 32.4 && t < 61.3 && this.fmtTime.format(new Date()) !== this.clockStr
    if (t !== this.lastT || ambient || minute) { seek(this, t); this.lastT = t }
    this.raf = requestAnimationFrame(this.frame)
  }

  // ─── input ──────────────────────────────────────────────────────────────────────

  private on<K extends keyof WindowEventMap>(type: K, fn: (e: WindowEventMap[K]) => void, o?: AddEventListenerOptions) {
    window.addEventListener(type, fn, o)
    this.off.push(() => window.removeEventListener(type, fn, o))
  }

  private bind() {
    const E = this.E
    this.on('wheel', e => {
      if (this.paused || (e.target as Element | null)?.closest?.('[data-take-prevent]')) return
      e.preventDefault(); this.stopAuto()
      const d = clamp(e.deltaY * (e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? this.L.vh : 1), -400, 400)
      this.goal = clamp(this.goal + d / this.L.BEAT_PX, 0, T_END + 1.4)
      if (d) this.lastDir = Math.sign(d)
      this.lastInput = performance.now(); this.src = 'virtual'
    }, { passive: false })
    this.on('scroll', () => {
      if (this.paused || Math.abs(window.scrollY - this.ownY) < 2) return
      this.stopAuto()
      const g = window.scrollY / this.L.BEAT_PX
      if (g !== this.goal) this.lastDir = Math.sign(g - this.goal) || this.lastDir
      this.goal = g; this.lastInput = performance.now(); this.src = 'native'
    }, { passive: true })
    this.on('touchstart', () => { if (!this.paused) { this.touching = true; this.stopAuto() } }, { passive: true })
    this.on('touchend', () => { this.touching = false; this.lastInput = performance.now() }, { passive: true })
    this.on('keydown', e => {
      const el = e.target as HTMLElement | null
      if (this.paused || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.closest('[role="dialog"]'))) return
      const base = this.snap ? this.snap.to : this.tT
      const onControl = el?.tagName === 'BUTTON' || el?.tagName === 'A' || el?.getAttribute('role') === 'button'
      if (e.code === 'Space' && !onControl) { e.preventDefault(); this.setPlaying(!this.playing) }
      else if (['ArrowDown', 'PageDown', 'ArrowRight'].includes(e.code)) { e.preventDefault(); this.snapTo(this.restFrom(base, 1)) }
      else if (['ArrowUp', 'PageUp', 'ArrowLeft'].includes(e.code)) { e.preventDefault(); this.snapTo(this.restFrom(base, -1)) }
      else if (e.code === 'Home') { e.preventDefault(); this.goTo(0) }
      else if (e.code === 'End') { e.preventDefault(); this.goTo(CHAPTERS[CHAPTERS.length - 1].beat) }
    })
    this.on('resize', () => {
      clearTimeout(this.resizeTimer)
      this.resizeTimer = window.setTimeout(() => { this.L = computeLayout(this); this.clickable = undefined; this.goal = this.tT; this.writeScroll(true); seek(this, this.tT); this.rasterBackdrop() }, 120)
    })

    // controls inside the film
    E.play.addEventListener('click', () => { this.hold = false; this.setPlaying(!this.playing) })
    E.chap.forEach((b, i) => b.addEventListener('click', () => this.goTo(CHAPTERS[i].beat)))
    E.tl.addEventListener('click', e => { const r = E.tl.getBoundingClientRect(); this.goTo(clamp((e.clientX - r.left) / r.width) * T_END) })
    E.projectsBtn.addEventListener('click', () => this.opts.onOpenProject(0, E.projectsBtn.getBoundingClientRect()))
    E.allBtn.addEventListener('click', () => this.opts.onOpenProject(0, E.allBtn.getBoundingClientRect()))
    E.tiles.forEach((o, i) => {
      const open = () => {
        if (!o.el.classList.contains('clickable')) return
        if (i === 0) this.playToCase()
        else this.opts.onOpenProject(i, o.el.getBoundingClientRect())
      }
      o.el.addEventListener('click', open)
      o.el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); open() } })
    })
    E.plBtn.addEventListener('click', () => this.opts.onOpenContact(E.plBtn.getBoundingClientRect()))
    E.caseA.addEventListener('click', e => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return
      e.preventDefault(); this.opts.onNavigate(E.caseA.getAttribute('href') ?? '/')
    })
    E.chrome.querySelector('.brand')?.addEventListener('click', e => { e.preventDefault(); this.goTo(0) })
  }
}

