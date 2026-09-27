/**
 * navGlass.ts — the chapter nav as a capsule of liquid glass, and the lens inside it that marks
 * the chapter on screen.
 *
 * The capsule blurs the film behind it and carries the same rim light as the glass in the film
 * (rrMaps). The lens runs on real time, not on the film's clock: a spring carries it to the
 * chapter, and it stretches along the way with its speed, like a drop pulled across the glass.
 */

import { rrMaps } from './glass'

const RESPONSE = 0.42, DAMPING = 0.78
const K = (2 * Math.PI / RESPONSE) ** 2, C = (4 * Math.PI * DAMPING) / RESPONSE

/** The glass rim light for a capsule, as its --rim background (a no-op while it is hidden). */
export function setRim(el: HTMLElement, bevel: number) {
  const w = el.offsetWidth, h = el.offsetHeight
  if (w && h) el.style.setProperty('--rim', `url(${rrMaps(w, h, h / 2, bevel).hl})`)
}

export class NavLens {
  private x = NaN
  private w = 0
  private vx = 0
  private vw = 0
  private tx = 0
  private tw = 0
  private i = -1
  private moving = false

  private readonly nav: HTMLElement
  private readonly lens: HTMLElement
  private readonly items: HTMLElement[]

  constructor(nav: HTMLElement, lens: HTMLElement, items: HTMLElement[]) {
    this.nav = nav; this.lens = lens; this.items = items
  }

  /** Glide to item i (or jump there, the first time and after a relayout). */
  to(i: number, jump = false) {
    this.i = i
    const b = this.items[i]
    if (!b?.offsetWidth) return
    this.tx = b.offsetLeft; this.tw = b.offsetWidth
    if (jump || Number.isNaN(this.x)) { this.x = this.tx; this.w = this.tw; this.vx = this.vw = 0 }
    this.moving = true
    this.draw()
  }

  /** Remeasure after a resize or a font swap: the lens lands where its item now is. */
  relayout() {
    setRim(this.nav, 9)
    const b = this.items[Math.max(0, this.i)]
    if (b?.offsetHeight) this.lens.style.setProperty('--rim', `url(${rrMaps(b.offsetWidth, b.offsetHeight, b.offsetHeight / 2, 7).hl})`)
    if (this.i >= 0) this.to(this.i, true)
  }

  /** One frame of the spring; false once the lens has settled. */
  step(dt: number): boolean {
    if (!this.moving) return false
    const ax = -K * (this.x - this.tx) - C * this.vx, aw = -K * (this.w - this.tw) - C * this.vw
    this.vx += ax * dt; this.vw += aw * dt
    this.x += this.vx * dt; this.w += this.vw * dt
    if (Math.abs(this.x - this.tx) < 0.05 && Math.abs(this.vx) < 2 && Math.abs(this.w - this.tw) < 0.05 && Math.abs(this.vw) < 2) {
      this.x = this.tx; this.w = this.tw; this.vx = this.vw = 0; this.moving = false
    }
    this.draw()
    return this.moving
  }

  private draw() {
    const s = Math.abs(this.vx), stretch = Math.min(26, s * 0.035), squash = Math.min(0.14, s * 0.00018)
    const w = this.w + stretch, left = this.x + this.w / 2 - w / 2
    this.lens.style.width = w.toFixed(2) + 'px'
    this.lens.style.transform = `translateX(${left.toFixed(2)}px) scaleY(${(1 - squash).toFixed(4)})`
  }
}
