/**
 * phone.ts — the playable phone. While the film rests on the phone beside the window
 * (PHONE_WINDOW), the lock screen it draws becomes a phone you can use: swipe up (or scroll, or
 * tap the hint) to unlock, a home screen with the projects as apps, and the ones that have a
 * phone capture open on a scrollable screenshot of the real app. Any scroll of the film locks it
 * again and the take goes on.
 *
 * The phone lives inside the film's #lock element, so it has the film's exact rect, bezel and
 * corner radius; the lock screen under it (clock, notifications, player) is the film's own. Every
 * size is in --pk, the lock's scale (lock height / 900), written by sceneLock each frame. Its
 * motion runs on real time, a one-shot spring per change (sprMs), stepped by Take.frame.
 */

import { mk } from './dom'
import { clamp, sprMs } from './math'
import type { TakeContent } from './content'

/** Beats the phone is at rest beside the window and can be used (the lock screen's edit mode starts at 46.15). */
export const PHONE_WINDOW: readonly [number, number] = [45.0, 46.1]

/** The projects that have a phone capture under /phone/<slug>.jpg (390 css px wide, 2×, the first screens). */
const SHOTS = new Set(['bugpilot', 'the-loop', 'stellar-freight-co', 'auroratrader'])

type State = 'locked' | 'home' | 'app'

interface Move { from: number; to: number; t0: number; r: number; d: number }

const move = (from: number, to: number, now: number, r: number, d: number): Move => ({ from, to, t0: now, r, d })
const at = (m: Move | null, now: number) => (m ? m.from + (m.to - m.from) * sprMs(now, m.t0, m.r, m.d) : 0)

export class Phone {
  readonly el: HTMLDivElement
  private readonly hint: HTMLDivElement
  private readonly home: HTMLDivElement
  private readonly time: HTMLSpanElement
  private readonly app: HTMLDivElement
  private readonly appScroll: HTMLDivElement
  private readonly appImg: HTMLImageElement
  private readonly icons: { el: HTMLButtonElement; slug: string; shot: boolean }[] = []
  private readonly clock: () => string

  private state: State = 'locked'
  private avail = false
  private shown = false
  private homeM: Move | null = null
  private appM: Move | null = null
  private from = { x: 0, y: 0, s: 0.2 }
  private drag: { id: number; y0: number; x0: number } | null = null
  private lastClock = ''

  constructor(lock: HTMLElement, c: TakeContent, clock: () => string) {
    this.clock = clock
    const el = mk('div', 'ph', lock)
    el.setAttribute('data-take-prevent', '')
    this.el = el

    this.hint = mk('div', 'ph-hint', el, '<span class="ph-bar"></span><span>Swipe up to open</span>')

    const home = mk('div', 'ph-home', el)
    home.innerHTML = `<svg class="ph-wp" aria-hidden="true"><use href="#wallpaper" width="100%" height="100%"/></svg><div class="ph-status"><span class="ph-time"></span><span class="ph-sig">●●● ▮</span></div><div class="ph-grid"></div><div class="ph-dock"></div><button type="button" class="ph-homebar" tabindex="-1" aria-label="Lock"></button>`
    this.home = home
    this.time = home.querySelector('.ph-time') as HTMLSpanElement
    const grid = home.querySelector('.ph-grid') as HTMLDivElement, dock = home.querySelector('.ph-dock') as HTMLDivElement
    const apps = c.projects.slice(0, 12)
    const docked = apps.filter(p => SHOTS.has(p.slug)).slice(0, 4), rest = apps.filter(p => !docked.includes(p))
    const icon = (p: TakeContent['projects'][number], parent: HTMLElement, label: boolean) => {
      const b = mk('button', 'ph-app-ic' + (p.light ? ' light' : ''), parent)
      b.type = 'button'; b.tabIndex = -1; b.setAttribute('aria-label', p.title)
      b.innerHTML = `<span class="ph-ic" style="background:${p.bg}"><svg aria-hidden="true"><use href="#${p.sym}" width="100%" height="100%"/></svg></span>${label ? `<span class="ph-lbl">${esc(p.title)}</span>` : ''}`
      const o = { el: b, slug: p.slug, shot: SHOTS.has(p.slug) }
      this.icons.push(o)
      b.addEventListener('click', e => { e.stopPropagation(); this.open(o) })
      return o
    }
    rest.forEach(p => icon(p, grid, true))
    docked.forEach(p => icon(p, dock, false))

    const app = mk('div', 'ph-app', el)
    app.innerHTML = `<div class="ph-scroll"><img alt="" decoding="async"></div><button type="button" class="ph-homebar" tabindex="-1" aria-label="Home"></button>`
    this.app = app
    this.appScroll = app.querySelector('.ph-scroll') as HTMLDivElement
    this.appImg = app.querySelector('img') as HTMLImageElement

    this.bind(home, app)
    this.draw(performance.now())
  }

  /** Whether the film rests on the phone: the phone takes input and shows its hint. */
  setAvailable(on: boolean, now: number) {
    if (on === this.avail) return
    this.avail = on
    this.el.classList.toggle('on', on)
    if (!on) this.lock(now)
  }

  /** One frame: springs and the clock. */
  step(now: number, idle: number) {
    const hintOn = this.avail && this.state === 'locked' && idle > 0.8
    this.hint.classList.toggle('show', hintOn)
    const s = this.clock()
    if (s !== this.lastClock) { this.lastClock = s; this.time.textContent = s }
    const live = this.shown || this.homeM !== null || this.appM !== null
    if (live) this.draw(now)
  }

  // ─── states ─────────────────────────────────────────────────────────────────

  private unlock(now: number) {
    if (this.state !== 'locked') return
    this.state = 'home'; this.shown = true
    this.homeM = move(at(this.homeM, now), 1, now, 0.55, 0.9)
  }

  private lock(now: number) {
    if (this.state === 'locked') return
    this.state = 'locked'; this.drag = null
    this.homeM = move(at(this.homeM, now), 0, now, 0.45, 1)
    if (this.appM) this.appM = move(at(this.appM, now), 0, now, 0.4, 1)
  }

  private open(o: { el: HTMLButtonElement; slug: string; shot: boolean }) {
    if (this.state !== 'home') return
    const now = performance.now()
    if (!o.shot) { o.el.classList.remove('nudge'); void o.el.offsetWidth; o.el.classList.add('nudge'); return }
    const R = this.el.getBoundingClientRect(), I = o.el.querySelector('.ph-ic')!.getBoundingClientRect()
    this.from = { x: (I.left - R.left) / R.width, y: (I.top - R.top) / R.height, s: I.width / R.width }
    this.appImg.src = `/phone/${o.slug}.jpg`
    this.appScroll.scrollTop = 0
    this.state = 'app'
    this.appM = move(0, 1, now, 0.5, 0.86)
  }

  private closeApp() {
    if (this.state !== 'app') return
    const now = performance.now()
    this.state = 'home'
    this.appM = move(at(this.appM, now), 0, now, 0.4, 1)
  }

  private draw(now: number) {
    const h = at(this.homeM, now), a = at(this.appM, now)
    const hv = h > 0.002, av = a > 0.002
    this.home.style.display = hv ? '' : 'none'
    if (hv) this.home.style.transform = `translateY(${((1 - h) * 100).toFixed(2)}%)`
    this.app.style.display = av ? '' : 'none'
    if (av) {
      const { x, y, s } = this.from, sc = s + (1 - s) * a
      this.app.style.transform = `translate(${(x * (1 - a) * 100).toFixed(2)}%,${(y * (1 - a) * 100).toFixed(2)}%) scale(${sc.toFixed(4)})`
      this.app.style.opacity = clamp(a * 3).toFixed(3)
      this.app.style.borderRadius = `${((1 - a) * 22).toFixed(1)}%`
    }
    const settled = (m: Move | null, v: number) => !m || Math.abs(v - m.to) < 0.001
    if (settled(this.homeM, h) && settled(this.appM, a)) { this.shown = h > 0.5 || a > 0.5; if (h < 0.001) this.homeM = null; if (a < 0.001) this.appM = null }
  }

  // ─── input ──────────────────────────────────────────────────────────────────

  private bind(home: HTMLDivElement, app: HTMLDivElement) {
    const el = this.el
    this.hint.addEventListener('click', () => this.unlock(performance.now()))
    ;(home.querySelector('.ph-homebar') as HTMLButtonElement).addEventListener('click', e => { e.stopPropagation(); this.lock(performance.now()) })
    ;(app.querySelector('.ph-homebar') as HTMLButtonElement).addEventListener('click', e => { e.stopPropagation(); this.closeApp() })
    // a swipe up unlocks; so does a scroll on the locked phone
    el.addEventListener('pointerdown', e => {
      if (!this.avail || this.state !== 'locked') return
      this.drag = { id: e.pointerId, y0: e.clientY, x0: e.clientX }
    })
    el.addEventListener('pointermove', e => {
      if (!this.drag || e.pointerId !== this.drag.id) return
      if (this.drag.y0 - e.clientY > 48) { this.drag = null; this.unlock(performance.now()) }
    })
    const end = () => { this.drag = null }
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end)
    el.addEventListener('wheel', e => {
      if (!this.avail) return
      if (this.state === 'locked' && Math.abs(e.deltaY) > 12) { e.preventDefault(); this.unlock(performance.now()) }
      else if (this.state === 'home') e.preventDefault()
      // in an app the wheel scrolls the screenshot natively
    }, { passive: false })
    el.addEventListener('keydown', e => { if (e.key === 'Escape' && this.state === 'app') { e.stopPropagation(); this.closeApp() } })
  }
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string))
}
