/**
 * Take — the film engine. React mounts it into an empty element and never touches its DOM.
 *
 * Scroll is the film's clock: 1 beat = BEAT_PX of page scroll, and the film stays wherever
 * the scroll leaves it. Wheel input moves a goal the film glides to: over a mouse wheel's
 * notches, closely behind a trackpad's stream. Touch and the scrollbar stay native. Space
 * plays the take at 120 BPM, holding on each rest frame to read it; arrows jump rest to rest.
 *
 * Jumping to a chapter plays the film there when the chapter is a few beats ahead; anything
 * further, or behind, is a cut: the film's own iris closes over the frame, the take jumps
 * underneath while the playhead crosses the timeline, and the iris opens on the chapter.
 */

import { buildEls, type Els } from './build'
import type { TakeContent } from './content'
import { computeLayout, type Lay } from './layout'
import { setIris } from './iris'
import { setRim } from './navGlass'
import { clamp, eio, lerp, SPB, sprMs } from './math'
import { hudAt, seek, tile0Screen } from './scenes'
import { CASE_BEAT, chapterAt, CHAPTERS, restHolds, RESTS, T_END } from './timeline'
import type { ChapterId } from '../TakeContext'

export interface TakeOptions {
  content: TakeContent
  /** Beat to open on (e.g. to keep the position when content reloads). */
  startBeat?: number
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

const SNAP_RATE = 2.2, REWIND_RATE = 3.4
/** Seconds the film takes to catch up: a mouse wheel's notch, a trackpad or touch stream. */
const WHEEL_TAU = 0.16, FINE_TAU = 0.06
/** A jump plays the film up to NEAR beats ahead (and a short way back); further is a cut. */
const NEAR = 9, NEAR_BACK = 1.5, CUT_CLOSE = 420, CUT_OPEN = { r: 0.55, d: 1 }

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
  private cut: { from: number; to: number; t0: number; t1: number } | null = null
  /** The chapter a jump is heading for: the nav's lens goes there on the click, not on arrival. */
  private heading = -1
  private lensAt = -1
  private src: 'virtual' | 'native' = 'virtual'
  private tau = WHEEL_TAU
  private fineUntil = 0
  private holds: number[]
  private holdUntil = 0
  private paused = false
  private last = performance.now()
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
    this.holds = restHolds(this.c)
    this.bind()
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    this.tT = this.goal = clamp(opts.startBeat ?? 0, 0, T_END - 0.001)
    this.paused = !!opts.startPaused
    if (opts.startPlaying) this.setPlaying(true)
    this.writeScroll(true)
    seek(this, this.tT)
    this.lastT = this.tT
    this.E.navLens.relayout(); setRim(this.E.play, 7)
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

  /** For reviewing single frames: jumps there and stops. */
  seekFrame(b: number) {
    this.stopAuto()
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
    this.playing = v; this.tween = null; this.snap = null; this.holdUntil = 0
    const b = this.E.play
    b.setAttribute('aria-pressed', String(v))
    ;(b.querySelector('span') as HTMLSpanElement).textContent = v ? 'Pause' : 'Play the take'
    b.querySelector('path')?.setAttribute('d', v ? 'M1 .5h3v9H1zM6 .5h3v9H6z' : 'M1 0.5v9l8-4.5z')
    setRim(b, 7)
  }

  private stopAuto() {
    if (this.playing) this.setPlaying(false)
    this.tween = null; this.snap = null
    if (!this.cutting) this.heading = -1
  }

  /** The iris is still closing: the take has not jumped yet, so input waits. */
  private get cutting() { return this.cut !== null && this.cut.t1 < 0 }

  private goTo(b: number) {
    b = clamp(b, 0, T_END - 0.001)
    const now = performance.now()
    if (this.cutting && this.cut) { this.cut.to = b; this.heading = chapterAt(b); return }
    this.stopAuto()
    if (Math.abs(b - this.tT) < 0.02) return
    this.heading = chapterAt(b)
    const ahead = (((b - this.tT) % T_END) + T_END) % T_END
    if (ahead <= NEAR) this.tween = { from: this.tT, to: this.tT + ahead, t0: now, dur: 350 + ahead * 170 }
    else if (b < this.tT && this.tT - b <= NEAR_BACK) this.tween = { from: this.tT, to: b, t0: now, dur: 350 + (this.tT - b) * 170 }
    else {
      // a cut while the iris is still opening closes it again from where it is
      const open = this.cut ? sprMs(now, this.cut.t1, CUT_OPEN.r, CUT_OPEN.d) : 1
      this.cut = { from: this.tT, to: b, t0: now - Math.sqrt(clamp(1 - open)) * CUT_CLOSE, t1: -1 }
    }
  }

  /** The shutter over a cut, the playhead crossing the timeline while it closes. */
  private drawCut(now: number) {
    const c = this.cut
    if (!c) return
    let open: number
    if (c.t1 < 0) {
      const q = clamp((now - c.t0) / CUT_CLOSE)
      open = 1 - q * q
      hudAt(this, lerp(c.from, c.to, eio(q)))
    } else open = sprMs(now, c.t1, CUT_OPEN.r, CUT_OPEN.d)
    const done = c.t1 >= 0 && open >= 0.999
    setIris(this.E.cutIris, this.L.vw, this.L.vh, done ? 1 : open)
    this.E.chrome.classList.toggle('shut', open < 0.5)
    if (done) this.cut = null
  }

  private snapTo(b: number) { this.stopAuto(); this.snap = { to: b }; this.src = 'virtual' }

  private restFrom(t: number, dir: number): number {
    if (dir > 0) return RESTS.find(r => r > t + 0.02) ?? T_END
    for (let i = RESTS.length - 1; i >= 0; i--) if (RESTS[i] < t - 0.02) return RESTS[i]
    return 0
  }

  private writeScroll(force = false) {
    const y = Math.round(this.tT * this.L.BEAT_PX)
    if (force || Math.abs(window.scrollY - y) > 1) { this.ownY = y; window.scrollTo(0, y) }
  }

  private frame = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    // the take jumps once the iris has shut
    if (this.cut && this.cut.t1 < 0 && now - this.cut.t0 >= CUT_CLOSE) {
      this.cut.t1 = now; this.heading = -1
      this.tT = this.goal = this.cut.to; this.src = 'virtual'; this.writeScroll(true)
    }
    if (!this.paused && !this.cutting) {
      if (this.tween) {
        const q = clamp((now - this.tween.t0) / this.tween.dur)
        this.tT = this.goal = lerp(this.tween.from, this.tween.to, eio(q))
        if (q >= 1) { this.tween = null; this.src = 'virtual'; this.heading = -1 }
      } else if (this.playing) {
        // play on at film speed, stopping on each rest frame long enough to read it
        if (now >= this.holdUntil) {
          const next = this.tT + dt / SPB, i = RESTS.findIndex(r => r > this.tT + 1e-6 && r <= next)
          if (i < 0) this.tT = this.goal = next
          else { this.tT = this.goal = RESTS[i]; this.holdUntil = now + this.holds[i] * 1000 }
        }
      } else if (this.snap) {
        const rem = this.snap.to - this.tT, dir = Math.sign(rem)
        const v = (dir > 0 ? SNAP_RATE : REWIND_RATE) * Math.min(1, 0.3 + Math.abs(rem) / 0.5)
        if (Math.abs(rem) <= v * dt) { this.tT = this.goal = this.snap.to; this.snap = null }
        else this.tT = this.goal = this.tT + dir * v * dt
      } else {
        this.tT += (this.goal - this.tT) * (1 - Math.exp(-dt / this.tau))
        if (Math.abs(this.goal - this.tT) < 1e-4) this.tT = this.goal
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
    this.drawCut(now)
    const want = this.heading >= 0 ? this.heading : this.chapter
    if (want >= 0 && want !== this.lensAt) {
      this.lensAt = want
      this.E.navLens.to(want)
      this.E.chap.forEach((b, i) => { b.classList.toggle('on', i === want); if (i === want) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current') })
    }
    this.E.navLens.step(dt)
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
      // ctrl + wheel is a pinch or a zoom: the browser's, not the film's
      if (this.paused || e.ctrlKey || (e.target as Element | null)?.closest?.('[data-take-prevent]')) return
      e.preventDefault()
      if (this.cutting) return
      this.stopAuto()
      const d = clamp(e.deltaY * (e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? this.L.vh : 1), -400, 400)
      this.goal = clamp(this.goal + d / this.L.BEAT_PX, 0, T_END + 1.4)
      // a trackpad streams small deltas that already carry the system's inertia, so the film
      // follows it closely for the rest of the gesture; a wheel notch jumps ~100px and is glided over
      const now = performance.now()
      if (e.deltaMode === 0 && Math.abs(e.deltaY) < 40) this.fineUntil = now + 600
      this.tau = now < this.fineUntil ? FINE_TAU : WHEEL_TAU
      this.src = 'virtual'
    }, { passive: false })
    this.on('scroll', () => {
      if (this.paused || this.cutting || Math.abs(window.scrollY - this.ownY) < 2) return
      this.stopAuto()
      this.goal = window.scrollY / this.L.BEAT_PX; this.tau = FINE_TAU; this.src = 'native'
    }, { passive: true })
    this.on('touchstart', () => { if (!this.paused) this.stopAuto() }, { passive: true })
    this.on('keydown', e => {
      const el = e.target as HTMLElement | null
      if (this.paused || this.cutting || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
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
      this.resizeTimer = window.setTimeout(() => { this.L = computeLayout(this); this.clickable = undefined; this.goal = this.tT; this.writeScroll(true); seek(this, this.tT); this.E.navLens.relayout(); setRim(this.E.play, 7); this.rasterBackdrop() }, 120)
    })

    // controls inside the film
    E.play.addEventListener('click', () => this.setPlaying(!this.playing))
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
    E.protosLink?.addEventListener('click', e => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      e.preventDefault(); this.opts.onNavigate(E.protosLink?.getAttribute('href') ?? '/prototypes')
    })
  }
}

