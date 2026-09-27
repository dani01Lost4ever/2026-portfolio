/** dom.ts — the handful of DOM writes the film makes every frame. */

import { spr, SP, type Spring } from './math'

export const SVG_NS = 'http://www.w3.org/2000/svg'

export function mk<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string | null, parent?: Element | null, html?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (html != null) e.innerHTML = html
  if (parent) parent.appendChild(e)
  return e
}

export function attrs(e: Element, o: Record<string, string | number>) {
  for (const k in o) e.setAttribute(k, String(o[k]))
}

export function show(e: HTMLElement | SVGElement, on: boolean) {
  const v = on ? '' : 'none'
  if (e.style.display !== v) e.style.display = v
}

/** Box by its top-left corner. */
export function boxTL(e: HTMLElement, x: number, y: number, w: number, h: number) {
  e.style.transform = `translate(${x}px,${y}px)`
  e.style.width = w + 'px'
  e.style.height = h + 'px'
}

/** Box by its centre, scaled about the centre (needs transform-origin 0 0). */
export function boxC(e: HTMLElement, cx: number, cy: number, w: number, h: number, sc = 1) {
  e.style.transform = `translate(${cx - (w * sc) / 2}px,${cy - (h * sc) / 2}px)` + (sc !== 1 ? ` scale(${sc})` : '')
  e.style.width = w + 'px'
  e.style.height = h + 'px'
}

/** Place an element's anchor (ax, ay as fractions of its own size) at x, y. */
export function at(e: HTMLElement, x: number, y: number, ax = 0, ay = 0) {
  e.style.transform = `translate(${x}px,${y}px) translate(${-ax * 100}%,${-ay * 100}%)`
}

/** A line of text inside its own mask, so it can rise out of it. */
export interface MLine { w: HTMLDivElement; s: HTMLSpanElement }

export function mline(parent: Element, text: string, cls?: string, html = false): MLine {
  const w = mk('div', 'm' + (cls ? ' ' + cls : ''), parent)
  const s = mk('span', null, w)
  if (html) s.innerHTML = text
  else s.textContent = text
  return { w, s }
}

/** Text enters from below its line and leaves through the top: never faded. Returns whether it is on screen. */
export function rise(ml: MLine, t: number, tin: number, tout: number | null, o: Spring = SP.text): boolean {
  const pin = spr(t, tin, o)
  const pout = tout == null ? 0 : spr(t, tout, o)
  if (pin < 0.002 || pout > 0.998) { show(ml.w, false); return false }
  show(ml.w, true)
  ml.s.style.transform = `translateY(${((1 - pin) * 110 - pout * 110).toFixed(2)}%)`
  return true
}

/** Same, for lines that stay in the layout: only the mask hides them. */
export function riseKeep(ml: MLine, t: number, tin: number, tout: number) {
  const a = spr(t, tin, SP.text)
  const b = spr(t, tout, SP.text)
  ml.s.style.transform = `translateY(${((1 - a) * 110 - b * 110).toFixed(2)}%)`
}

const mctx = document.createElement('canvas').getContext('2d')
export function textW(s: string, font: string): number {
  if (!mctx) return s.length * 10
  mctx.font = font
  return mctx.measureText(s).width
}

export function measureSpan(text: string, css: string): number {
  const s = mk('span', null, document.body, '')
  s.textContent = text
  s.style.cssText = 'position:absolute;left:-9999px;top:0;white-space:nowrap;' + css
  const w = s.getBoundingClientRect().width
  s.remove()
  return w
}

/** Distance from the top of a line-height:1 box to its baseline. */
export function baselineOf(css: string): number {
  const s = mk('span', null, document.body)
  s.style.cssText = 'position:absolute;left:-9999px;top:0;white-space:nowrap;line-height:1;' + css
  s.innerHTML = 'd<i style="display:inline-block;width:0;height:0;vertical-align:baseline"></i>'
  const i = s.lastElementChild as HTMLElement
  const b = i.getBoundingClientRect().top - s.getBoundingClientRect().top
  s.remove()
  return b
}
