/**
 * phone.ts — the playable phone. While the film rests on the phone beside the window
 * (PHONE_WINDOW), the lock screen it draws becomes a phone you can use: swipe up (or scroll, or
 * tap the hint) to unlock; two home pages, the apps and then the widgets, swiped side to side;
 * every app opens, the ones with a phone capture on a scrollable screenshot of the real app, Lumen on the live game in a frame, the
 * others on a card of the project; a long press on an app lets you drag the apps around, like
 * on the real thing, and the order is remembered. Any scroll of the film locks it again.
 *
 * The phone lives inside the film's #lock element, so it has the film's exact rect, bezel and
 * corner radius; the lock screen under it (clock, notifications, player) is the film's own. Every
 * size is in --pk, the lock's scale (lock height / 900), written by sceneLock each frame. Its
 * motion runs on real time, a one-shot spring per change (sprMs), stepped by Take.frame.
 */

import { mk } from './dom'
import { clamp, sprMs } from './math'
import { ICO } from './icons'
import type { TakeContent, TakeProject } from './content'

/** Beats the phone is at rest beside the window and can be used (the lock screen's edit mode starts at 46.15). */
export const PHONE_WINDOW: readonly [number, number] = [45.0, 46.1]

/** What an app shows when it opens: a phone capture under /phone/<slug>.jpg (390 css px wide, 2×, the first
 * screens), or the live app itself in a frame (Lumen plays for real). Apps without a screen open on their card. */
interface Screen { shot?: true; frame?: string }
const SCREENS: Record<string, Screen> = {
  bugpilot: { shot: true }, lumen: { frame: 'https://lumen.techdani.cc/' }, 'the-loop': { shot: true }, 'stellar-freight-co': { shot: true }, auroratrader: { shot: true },
}

const ORDER_KEY = 'take-phone-order'
/** The home grid, in the phone's 440-wide units. */
const COLS = 4, PAD = 26, ROW = 94, LONG_PRESS = 420

type State = 'locked' | 'home' | 'app'

interface Move { from: number; to: number; t0: number; r: number; d: number }
const move = (from: number, to: number, now: number, r: number, d: number): Move => ({ from, to, t0: now, r, d })
const at = (m: Move | null, now: number) => (m ? m.from + (m.to - m.from) * sprMs(now, m.t0, m.r, m.d) : 0)

/** An app on the home screen: a project, or the mail and GitHub shortcuts. */
interface App { id: string; el: HTMLButtonElement; p?: TakeProject; screen: Screen | null }

export interface PhoneHooks {
  clock(): string
  onNavigate(path: string): void
  onContact(from: DOMRect): void
}

export class Phone {
  readonly el: HTMLDivElement
  private readonly hint: HTMLDivElement
  private readonly home: HTMLDivElement
  private readonly pages: HTMLDivElement
  private readonly page1: HTMLDivElement
  private readonly dots: HTMLSpanElement[]
  private readonly time: HTMLSpanElement
  private readonly app: HTMLDivElement
  private readonly appScroll: HTMLDivElement
  private readonly appImg: HTMLImageElement
  private readonly frame: HTMLIFrameElement
  private readonly card: HTMLDivElement
  private readonly apps: App[] = []
  private readonly hooks: PhoneHooks
  private readonly github: string | null

  private state: State = 'locked'
  private avail = false
  private shown = false
  // the spotlight: 1 while the phone has you (its hint is up, or it is unlocked), on a spring
  private focusM: Move | null = null
  private focusOn = false
  private homeM: Move | null = null
  private appM: Move | null = null
  private from = { x: 0, y: 0, s: 0.2 }
  private lastClock = ''
  private offKey: () => void = () => {}

  // home: pages and the apps' order
  private page = 0
  private pageM: Move | null = null
  private pageDrag: number | null = null
  private order: string[] = []
  private jiggle = false
  private gesture: { id: number; x0: number; y0: number; t0: number; app: App | null; timer: number; mode: 'tap' | 'page' | 'drag' | 'swipe' } | null = null
  private dragging: { app: App; dx: number; dy: number; x: number; y: number } | null = null
  private layoutW = 0

  // lock screen: the notifications can be swiped away. sceneLock writes each card's rect (in
  // lock px) and reads back its shift; a card swiped past a third of its width flies out.
  readonly cardRects: { x: number; y: number; w: number; h: number }[] = []
  private cards: { dx: number; m: Move | null; gone: boolean }[] = []
  private cardDrag: { j: number; x0: number } | null = null

  constructor(lock: HTMLElement, c: TakeContent, hooks: PhoneHooks) {
    this.hooks = hooks; this.github = c.github
    const el = mk('div', 'ph', lock)
    el.setAttribute('data-take-prevent', '')
    this.el = el

    this.hint = mk('div', 'ph-hint', el, '<span class="ph-bar"></span><span>Swipe up to open</span>')

    const home = mk('div', 'ph-home', el)
    home.innerHTML = `<svg class="ph-wp" aria-hidden="true"><use href="#wallpaper" width="100%" height="100%"/></svg>
      <div class="ph-status"><span class="ph-time"></span><span class="ph-sig">●●● ▮</span></div>
      <div class="ph-pages"><div class="ph-page ph-page1"></div><div class="ph-page ph-page2"></div></div>
      <div class="ph-dots"><span class="on"></span><span></span></div>
      <div class="ph-dock"></div>
      <button type="button" class="ph-homebar" tabindex="-1" aria-label="Lock"></button>`
    this.home = home
    this.time = home.querySelector('.ph-time') as HTMLSpanElement
    this.pages = home.querySelector('.ph-pages') as HTMLDivElement
    this.page1 = home.querySelector('.ph-page1') as HTMLDivElement
    this.dots = [...home.querySelectorAll<HTMLSpanElement>('.ph-dots span')]
    const page2 = home.querySelector('.ph-page2') as HTMLDivElement, dock = home.querySelector('.ph-dock') as HTMLDivElement

    // apps: the projects with a capture in the dock, the others on the first page with mail and GitHub
    const projects = c.projects.slice(0, 12)
    const docked = projects.filter(p => SCREENS[p.slug]).slice(0, 4), rest = projects.filter(p => !docked.includes(p))
    const icon = (id: string, parent: HTMLElement, label: string | null, inner: string, p?: TakeProject) => {
      const b = mk('button', 'ph-app-ic', parent)
      b.type = 'button'; b.tabIndex = -1; b.setAttribute('aria-label', label ?? p?.title ?? id); b.dataset.app = id
      b.innerHTML = `${inner}${label ? `<span class="ph-lbl">${esc(label)}</span>` : ''}`
      const o: App = { id, el: b, p, screen: p ? SCREENS[p.slug] ?? null : null }
      this.apps.push(o)
      b.addEventListener('click', e => { e.stopPropagation(); if (!this.jiggle) this.open(o) })
      return o
    }
    const poster = (p: TakeProject) => `<span class="ph-ic" style="background:${p.bg}"><svg aria-hidden="true"><use href="#${p.sym}" width="100%" height="100%"/></svg></span>`
    rest.forEach(p => icon(p.slug, this.page1, p.title, poster(p), p))
    icon('mail', this.page1, 'Mail', `<span class="ph-ic ph-ic-mail">${ICO.plane}</span>`)
    if (this.github) icon('github', this.page1, 'GitHub', '<span class="ph-ic ph-ic-gh"><b>gh</b></span>')
    docked.forEach(p => icon(p.slug, dock, null, poster(p), p))
    this.order = this.loadOrder(this.apps.filter(a => a.el.parentElement === this.page1).map(a => a.id))

    // the widgets page: what I am up to, the track, where I am
    const now = c.now.map(n => `<div class="ph-now"><span class="ph-now-ic" style="background:${n.c}">${esc(n.i)}</span><span class="ph-now-k">${esc(n.k)}</span><span class="ph-now-v">${esc(n.v)}</span></div>`).join('')
    page2.innerHTML = `
      <div class="ph-w ph-w42"><div class="ph-w-t">Now</div>${now}</div>
      <div class="ph-w ph-w22 ph-w-music">${c.track ? `<div class="ph-w-art"></div><div class="ph-w-song"><b>${esc(c.track.title)}</b><span>${esc(c.track.artist)}</span></div><div class="ph-w-ctl">${ICO.prev}${ICO.play}${ICO.next}</div>` : '<div class="ph-w-t">Music</div>'}</div>
      <div class="ph-w ph-w22 ph-w-where"><div class="ph-w-t">${esc(c.location)}</div><div class="ph-w-big">${esc(c.availability || 'Open to work')}</div></div>`

    const app = mk('div', 'ph-app', el)
    app.innerHTML = `<div class="ph-scroll"><img alt="" decoding="async"><div class="ph-card"></div></div><iframe class="ph-frame" title="" tabindex="-1"></iframe><div class="ph-edge"></div><button type="button" class="ph-homebar" tabindex="-1" aria-label="Home"></button>`
    this.app = app
    this.appScroll = app.querySelector('.ph-scroll') as HTMLDivElement
    this.appImg = app.querySelector('img') as HTMLImageElement
    this.frame = app.querySelector('iframe') as HTMLIFrameElement
    this.card = app.querySelector('.ph-card') as HTMLDivElement
    this.card.addEventListener('click', e => {
      const a = (e.target as HTMLElement).closest<HTMLElement>('[data-path]')
      if (a) { e.stopPropagation(); this.hooks.onNavigate(a.dataset.path!) }
    })

    this.bind(home, app)
    this.draw(performance.now())
  }

  /** Whether the film rests on the phone: the phone takes input and shows its hint. */
  setAvailable(on: boolean, now: number) {
    if (on === this.avail) return
    this.avail = on
    this.el.classList.toggle('on', on)
    if (!on) { this.lock(now); this.cards = []; this.cardDrag = null }
  }

  /** Where notification j sits now: its sideways shift in lock px, how much of it is left, and whether it is gone. */
  cardShift(j: number): { dx: number; a: number; gone: boolean } {
    const c = this.cards[j]
    if (!c) return { dx: 0, a: 1, gone: false }
    const dx = c.m ? at(c.m, performance.now()) : c.dx, w = this.cardRects[j]?.w || 1
    if (c.m && Math.abs(dx - c.m.to) < 0.5) { c.dx = c.m.to; c.m = null; if (c.gone) return { dx, a: 0, gone: true } }
    return { dx, a: clamp(1 - Math.abs(dx) / w), gone: false }
  }

  /** One frame: springs, the clock, the apps' places. */
  step(now: number, idle: number) {
    const hintOn = this.avail && this.state === 'locked' && idle > 0.8
    this.hint.classList.toggle('show', hintOn)
    const want = this.avail && (hintOn || this.state !== 'locked')
    if (want !== this.focusOn) { this.focusOn = want; this.focusM = move(at(this.focusM, now), want ? 1 : 0, now, want ? 0.6 : 0.4, 1) }
    const s = this.hooks.clock()
    if (s !== this.lastClock) { this.lastClock = s; this.time.textContent = s }
    const live = this.shown || this.homeM !== null || this.appM !== null || this.pageM !== null || this.pageDrag !== null || this.dragging !== null || this.cardDrag !== null
    if (live) this.draw(now)
  }

  /** How much the stage is dimmed around the phone, 0–1. */
  focus(now: number): number { return this.focusM ? at(this.focusM, now) : 0 }

  destroy() { this.offKey() }

  // ─── states ─────────────────────────────────────────────────────────────────

  private unlock(now: number) {
    if (this.state !== 'locked') return
    this.state = 'home'; this.shown = true
    this.homeM = move(at(this.homeM, now), 1, now, 0.55, 0.9)
    this.layoutApps()
  }

  private lock(now: number) {
    if (this.state === 'locked') return
    this.state = 'locked'; this.gesture = null; this.dragging = null; this.pageDrag = null
    this.setJiggle(false)
    this.homeM = move(at(this.homeM, now), 0, now, 0.45, 1)
    if (this.appM) this.appM = move(at(this.appM, now), 0, now, 0.4, 1)
  }

  /** Every app opens: the ones with a capture on the real thing, the others on a card of the project; mail and GitHub leave the phone. */
  private open(o: App) {
    if (this.state !== 'home') return
    const I = o.el.querySelector('.ph-ic')!.getBoundingClientRect()
    if (o.id === 'mail') { this.hooks.onContact(I); return }
    if (o.id === 'github') { if (this.github) window.open(this.github, '_blank', 'noopener'); return }
    if (!o.p) return
    const now = performance.now(), R = this.el.getBoundingClientRect()
    this.from = { x: (I.left - R.left) / R.width, y: (I.top - R.top) / R.height, s: I.width / R.width }
    const s = o.screen
    this.appScroll.style.display = s?.frame ? 'none' : ''
    this.appImg.style.display = s?.shot ? '' : 'none'
    this.card.style.display = s ? 'none' : ''
    this.frame.style.display = s?.frame ? '' : 'none'
    this.app.style.background = s?.frame ? o.p.bg : ''
    this.app.classList.toggle('framed', !!s?.frame)
    if (s?.shot) this.appImg.src = `/phone/${o.p.slug}.jpg`
    else if (s?.frame) { this.frame.title = o.p.title; this.frame.src = s.frame }
    else this.card.innerHTML = cardHTML(o.p)
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

  private goPage(i: number, now: number) {
    i = clamp(i, 0, 1)
    const cur = this.pageDrag ?? at(this.pageM, now) + (this.pageM ? 0 : this.page)
    this.pageM = move(this.pageM || this.pageDrag !== null ? cur : this.page, i, now, 0.45, 0.95)
    this.pageDrag = null
    this.page = i
    this.dots.forEach((d, j) => d.classList.toggle('on', j === i))
  }

  private setJiggle(on: boolean) {
    if (on === this.jiggle) return
    this.jiggle = on
    this.home.classList.toggle('jiggle', on)
  }

  // ─── the apps' places ───────────────────────────────────────────────────────

  private loadOrder(ids: string[]): string[] {
    try {
      const saved = JSON.parse(localStorage.getItem(ORDER_KEY) || '[]') as string[]
      const kept = saved.filter(id => ids.includes(id))
      return [...kept, ...ids.filter(id => !kept.includes(id))]
    } catch { return ids }
  }

  private saveOrder() { try { localStorage.setItem(ORDER_KEY, JSON.stringify(this.order)) } catch { /* private mode */ } }

  private u() { return parseFloat(getComputedStyle(this.el).getPropertyValue('--pk')) || 1 }

  /** Cell i of the first page, in px inside the page. */
  private cell(i: number, u: number) {
    const W = this.page1.clientWidth || this.el.clientWidth, slot = (W - 2 * PAD * u) / COLS
    return { x: PAD * u + (i % COLS) * slot, y: (i >= 0 ? Math.floor(i / COLS) : 0) * ROW * u, w: slot }
  }

  /** Place every app of the first page on its cell (the dragged one follows the pointer). */
  private layoutApps() {
    const u = this.u()
    this.layoutW = this.page1.clientWidth
    this.order.forEach((id, i) => {
      const a = this.apps.find(x => x.id === id)
      if (!a || (this.dragging && this.dragging.app === a)) return
      const c = this.cell(i, u)
      a.el.style.width = c.w + 'px'
      a.el.style.transform = `translate(${c.x.toFixed(1)}px,${c.y.toFixed(1)}px)`
    })
  }

  private cellAt(x: number, y: number): number {
    const u = this.u(), W = this.page1.clientWidth, slot = (W - 2 * PAD * u) / COLS
    const col = clamp(Math.floor((x - PAD * u) / slot), 0, COLS - 1), row = Math.max(0, Math.floor(y / (ROW * u)))
    return clamp(row * COLS + col, 0, this.order.length - 1)
  }

  private draw(now: number) {
    const h = at(this.homeM, now), a = at(this.appM, now)
    const hv = h > 0.002, av = a > 0.002
    this.home.style.display = hv ? '' : 'none'
    if (hv) {
      this.home.style.transform = `translateY(${((1 - h) * 100).toFixed(2)}%)`
      if (this.page1.clientWidth !== this.layoutW) this.layoutApps()
      const p = this.pageDrag ?? (this.pageM ? at(this.pageM, now) : this.page)
      this.pages.style.transform = `translateX(${(-p * 50).toFixed(3)}%)` // the strip is two pages wide
      if (this.pageM && Math.abs(p - this.pageM.to) < 0.0005) this.pageM = null
      if (this.dragging) {
        const d = this.dragging
        d.app.el.style.transform = `translate(${d.x.toFixed(1)}px,${d.y.toFixed(1)}px) scale(1.12)`
      }
    }
    this.app.style.display = av ? '' : 'none'
    if (av) {
      const { x, y, s } = this.from, sc = s + (1 - s) * a
      this.app.style.transform = `translate(${(x * (1 - a) * 100).toFixed(2)}%,${(y * (1 - a) * 100).toFixed(2)}%) scale(${sc.toFixed(4)})`
      this.app.style.opacity = clamp(a * 3).toFixed(3)
      this.app.style.borderRadius = `${((1 - a) * 22).toFixed(1)}%`
    }
    const settled = (m: Move | null, v: number) => !m || Math.abs(v - m.to) < 0.001
    if (settled(this.homeM, h) && settled(this.appM, a)) {
      this.shown = h > 0.5 || a > 0.5
      if (h < 0.001) this.homeM = null
      if (a < 0.001) { this.appM = null; if (this.frame.src) this.frame.removeAttribute('src') } // a closed frame stops playing
    }
  }

  // ─── input ──────────────────────────────────────────────────────────────────

  private bind(home: HTMLDivElement, app: HTMLDivElement) {
    const el = this.el
    this.hint.addEventListener('click', () => this.unlock(performance.now()))
    ;(home.querySelector('.ph-homebar') as HTMLButtonElement).addEventListener('click', e => { e.stopPropagation(); if (this.jiggle) this.setJiggle(false); else this.lock(performance.now()) })
    ;(app.querySelector('.ph-homebar') as HTMLButtonElement).addEventListener('click', e => { e.stopPropagation(); this.closeApp() })
    this.dots.forEach((d, i) => d.addEventListener('click', () => this.goPage(i, performance.now())))

    // locked: a swipe up (or a scroll) unlocks. In an app: a swipe up from the bottom edge goes
    // home. On the home: a sideways drag turns the page, a long press on an app picks it up to
    // drag it around (and a tap on the background puts the apps down again).
    el.addEventListener('pointerdown', e => {
      if (!this.avail || e.button !== 0) return
      const R = el.getBoundingClientRect(), edge = e.clientY > R.bottom - R.height * 0.08
      const appEl = (e.target as HTMLElement).closest<HTMLButtonElement>('.ph-page1 .ph-app-ic')
      const a = appEl ? this.apps.find(x => x.el === appEl) ?? null : null
      if (this.state === 'locked' || (this.state === 'app' && edge)) {
        this.gesture = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), app: null, timer: 0, mode: 'swipe' }
        // on a notification, a sideways drag takes the card with it
        if (this.state === 'locked') {
          const lx = e.clientX - R.left, ly = e.clientY - R.top
          const j = this.cardRects.findIndex((c, i) => c && !this.cards[i]?.gone && lx >= c.x && lx <= c.x + c.w && ly >= c.y && ly <= c.y + c.h)
          if (j >= 0) { this.cardDrag = { j, x0: e.clientX }; this.cards[j] = { dx: 0, m: null, gone: false } }
        }
      } else if (this.state === 'home' && !edge) {
        const g = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), app: a, timer: 0, mode: 'tap' as const }
        this.gesture = g
        if (a && this.jiggle) this.pickUp(a, e)
        else if (a) g.timer = window.setTimeout(() => { if (this.gesture === g && g.mode === 'tap') { this.setJiggle(true); this.pickUp(a, e) } }, LONG_PRESS)
      }
    })
    el.addEventListener('pointermove', e => {
      const g = this.gesture
      if (!g || e.pointerId !== g.id) return
      const dx = e.clientX - g.x0, dy = e.clientY - g.y0
      if (g.mode === 'swipe') {
        const cd = this.cardDrag
        if (cd && (Math.abs(dx) > 8 || Math.abs(dx) > Math.abs(dy))) { this.cards[cd.j].dx = e.clientX - cd.x0; return }
        if (-dy > 48 && !cd) { this.gesture = null; if (this.state === 'locked') this.unlock(performance.now()); else this.closeApp() }
        return
      }
      if (g.mode === 'drag') { this.dragTo(e); return }
      if (g.mode === 'tap' && Math.hypot(dx, dy) > 10) {
        clearTimeout(g.timer)
        if (Math.abs(dx) > Math.abs(dy)) { g.mode = 'page'; e.preventDefault() } else { this.gesture = null; return }
      }
      if (g.mode === 'page') this.pageDrag = clamp(this.page - dx / (this.page1.clientWidth || 1), -0.15, 1.15)
    })
    const end = (e: PointerEvent) => {
      const g = this.gesture
      if (!g || e.pointerId !== g.id) return
      clearTimeout(g.timer)
      this.gesture = null
      const cd = this.cardDrag
      if (cd) {
        this.cardDrag = null
        const c = this.cards[cd.j], w = this.cardRects[cd.j]?.w || 300, now = performance.now()
        const gone = Math.abs(c.dx) > w / 3
        c.gone = gone
        c.m = move(c.dx, gone ? Math.sign(c.dx || 1) * w * 1.3 : 0, now, gone ? 0.3 : 0.4, gone ? 1 : 0.7)
        if (Math.abs(c.dx) > 4) return
      }
      if (g.mode === 'drag') this.drop()
      else if (g.mode === 'page') { const dx = e.clientX - g.x0, W = this.page1.clientWidth || 1; this.goPage(Math.abs(dx) > W * 0.2 ? this.page - Math.sign(dx) : this.page, performance.now()) }
      else if (g.mode === 'tap' && this.jiggle && !g.app && e.type === 'pointerup') this.setJiggle(false)
    }
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end)
    el.addEventListener('wheel', e => {
      if (!this.avail) return
      if (this.state === 'locked' && Math.abs(e.deltaY) > 12) { e.preventDefault(); this.unlock(performance.now()) }
      else if (this.state === 'home') {
        e.preventDefault()
        if (Math.abs(e.deltaX) > 24 && !this.pageM) this.goPage(this.page + Math.sign(e.deltaX), performance.now())
      }
      // in an app the wheel scrolls the screenshot natively
    }, { passive: false })
    // Escape closes the app, or puts the apps down
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !this.avail) return
      if (this.state === 'app') { e.stopPropagation(); this.closeApp() }
      else if (this.jiggle) { e.stopPropagation(); this.setJiggle(false) }
    }
    window.addEventListener('keydown', onKey, true)
    this.offKey = () => window.removeEventListener('keydown', onKey, true)
  }

  private pickUp(a: App, e: PointerEvent) {
    const g = this.gesture
    if (!g) return
    g.mode = 'drag'
    const P = this.page1.getBoundingClientRect(), i = this.order.indexOf(a.id), c = this.cell(i, this.u())
    this.dragging = { app: a, dx: e.clientX - P.left - c.x, dy: e.clientY - P.top - c.y, x: c.x, y: c.y }
    a.el.classList.add('drag')
    try { this.el.setPointerCapture(e.pointerId) } catch { /* a pointer that is already up */ }
  }

  private dragTo(e: PointerEvent) {
    const d = this.dragging
    if (!d) return
    const P = this.page1.getBoundingClientRect()
    d.x = e.clientX - P.left - d.dx; d.y = e.clientY - P.top - d.dy
    // over another cell: the apps make room
    const u = this.u(), c = this.cell(0, u), to = this.cellAt(d.x + c.w / 2, d.y + (ROW * u) / 2), fromI = this.order.indexOf(d.app.id)
    if (to !== fromI) { this.order.splice(fromI, 1); this.order.splice(to, 0, d.app.id); this.layoutApps() }
  }

  private drop() {
    const d = this.dragging
    if (!d) return
    this.dragging = null
    d.app.el.classList.remove('drag')
    this.saveOrder()
    this.layoutApps()
  }
}

/** The project as an app page: poster, name, the headline, the numbers, the story, and the way to the case study. */
function cardHTML(p: TakeProject): string {
  const res = p.results.map(r => `<div class="ph-res"><b>${esc(r.value)}</b><span>${esc(r.label)}</span></div>`).join('')
  const tags = p.tags.slice(0, 6).map(t => `<span>${esc(t)}</span>`).join('')
  return `
    <div class="ph-hero" style="background:${p.bg}"><svg aria-hidden="true"><use href="#${p.sym}" width="100%" height="100%"/></svg></div>
    <div class="ph-body">
      <div class="ph-k">${esc(p.n)} · ${esc(p.year)}${p.role ? ' · ' + esc(p.role) : ''}</div>
      <h3>${esc(p.title)}</h3>
      <p class="ph-sub">${esc(p.sub)}</p>
      ${res ? `<div class="ph-ress">${res}</div>` : ''}
      <p class="ph-desc">${esc(p.description)}</p>
      ${tags ? `<div class="ph-tags">${tags}</div>` : ''}
      <button type="button" class="ph-cta" tabindex="-1" data-path="/project/${esc(p.slug)}">Read the case study →</button>
    </div>`
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string))
}
