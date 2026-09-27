/**
 * iris.ts — six blades around a hexagonal aperture. Blade k is its two vertices, the
 * extensions of the edges that meet them, and the short arc between where those
 * extensions reach the rim.
 */

import { attrs, show, SVG_NS } from './dom'
import { clamp } from './math'

function irisD(cx: number, cy: number, a: number, rot: number, Rb: number): string[] {
  const V: [number, number][] = [], P: [number, number][] = []
  for (let i = 0; i < 6; i++) { const g = rot + (i * Math.PI) / 3; V.push([cx + a * Math.cos(g), cy + a * Math.sin(g)]) }
  for (let k = 0; k < 6; k++) {
    const A = V[k], B = V[(k + 1) % 6]
    let dx = B[0] - A[0], dy = B[1] - A[1]
    const l = Math.hypot(dx, dy) || 1
    dx /= l; dy /= l
    const ox = B[0] - cx, oy = B[1] - cy, b = ox * dx + oy * dy, c = ox * ox + oy * oy - Rb * Rb
    const s = -b + Math.sqrt(Math.max(0, b * b - c))
    P.push([B[0] + dx * s, B[1] + dy * s])
  }
  const f = (n: number) => n.toFixed(1)
  const out: string[] = []
  for (let k = 0; k < 6; k++) {
    const Pp = P[(k + 5) % 6], Vk = V[k], Vn = V[(k + 1) % 6], Pk = P[k]
    const a0 = Math.atan2(Pk[1] - cy, Pk[0] - cx)
    let da = Math.atan2(Pp[1] - cy, Pp[0] - cx) - a0
    while (da > Math.PI) da -= 2 * Math.PI
    while (da < -Math.PI) da += 2 * Math.PI
    let d = `M${f(Pp[0])} ${f(Pp[1])}L${f(Vk[0])} ${f(Vk[1])}L${f(Vn[0])} ${f(Vn[1])}L${f(Pk[0])} ${f(Pk[1])}`
    for (let j = 1; j <= 10; j++) { const g = a0 + (da * j) / 10; d += `L${f(cx + Rb * Math.cos(g))} ${f(cy + Rb * Math.sin(g))}` }
    out.push(d + 'Z')
  }
  return out
}

export interface Iris { s: SVGSVGElement; paths: SVGPathElement[] }

export function makeIris(parent: Element): Iris {
  const s = document.createElementNS(SVG_NS, 'svg')
  s.setAttribute('class', 'iris')
  parent.appendChild(s)
  const paths: SVGPathElement[] = []
  for (let k = 0; k < 6; k++) {
    const p = document.createElementNS(SVG_NS, 'path')
    attrs(p, { fill: k % 2 ? '#1b1b1c' : '#131314', stroke: '#343436', 'stroke-width': 1 })
    s.appendChild(p)
    paths.push(p)
  }
  return { s, paths }
}

/** alpha: 1 open, 0 closed. Slightly past zero already counts as shut, so what is behind can change unseen. */
export function setIris(ir: Iris, w: number, h: number, alpha: number) {
  const al = clamp((alpha - 0.03) / 0.97, 0, 2), R = Math.hypot(w, h) / 2, aOpen = (R / 0.866) * 1.03
  if (al >= 0.999) { show(ir.s, false); return }
  show(ir.s, true)
  ir.s.setAttribute('viewBox', `0 0 ${w} ${h}`)
  const d = irisD(w / 2, h / 2, Math.max(0.001, al) * aOpen, -0.35 + (1 - al) * 0.95, R * 1.6)
  for (let k = 0; k < 6; k++) ir.paths[k].setAttribute('d', d[k])
}
