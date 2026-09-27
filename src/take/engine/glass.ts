/**
 * glass.ts — liquid glass.
 *
 * Each glass element holds its own clone of the scene behind it (a <use> of the same SVG
 * symbol, aligned in screen space) and runs it through three feDisplacementMaps at slightly
 * different scales, one per colour channel, for chromatic edges. The maps are distance fields
 * drawn on a canvas: analytic for rounded rects, an exact EDT for glyphs. backdrop-filter:url()
 * is not used on purpose: Chromium misreads displacement maps through it.
 */

import { attrs, mk, SVG_NS } from './dom'
import { clamp } from './math'

const LD = (() => { const x = -0.55, y = -0.83, l = Math.hypot(x, y); return [x / l, y / l] as const })()

/** One pixel of map (displacement along the outward normal in the bevel) and of rim light. */
function px(M: Uint8ClampedArray, H: Uint8ClampedArray, i: number, d: number, nx: number, ny: number, B: number, ex: number, ey: number) {
  const e = d < B ? 1 - Math.max(d, 0) / B : 0
  const m = e * e
  const ox = clamp(m * nx + ex, -1, 1), oy = clamp(m * ny + ey, -1, 1)
  M[i] = 128 + 127 * ox; M[i + 1] = 128 + 127 * oy; M[i + 2] = 128; M[i + 3] = 255
  if (d < -0.5) { H[i + 3] = 0; return }
  const ld = nx * LD[0] + ny * LD[1]
  const rim = Math.exp(-Math.max(d, 0) / 0.9) * 0.95 + 0.24 * m
  const a = clamp(rim * (0.3 + 0.7 * Math.max(0, ld) + 0.25 * Math.max(0, -ld)))
  const sh = clamp(0.5 * m * Math.max(0, -ld) + 0.18 * m)
  const A = a + sh * (1 - a)
  H[i] = H[i + 1] = H[i + 2] = A > 0 ? (255 * a) / (a + sh + 1e-6) : 255
  H[i + 3] = 255 * A
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const x = c.getContext('2d', { willReadFrequently: true })
  if (!x) throw new Error('2d canvas unavailable')
  return { c, x }
}

export interface Maps { map: string; hl: string }

const cache = new Map<string, Maps>()

/** Displacement map and rim light for a rounded rect, at half resolution, cached by quantized size. */
export function rrMaps(w: number, h: number, r: number, bevel: number, lens = 0): Maps {
  const q = 6
  const W = Math.max(6, Math.round(w / 2 / q) * q), H = Math.max(6, Math.round(h / 2 / q) * q)
  const R = Math.min(r / 2, W / 2, H / 2), B = Math.max(1.5, Math.min(bevel / 2, R))
  const key = `${W}|${H}|${R | 0}|${B | 0}|${lens}`
  const hit = cache.get(key)
  if (hit) return hit
  const mc = canvas(W, H), hc = canvas(W, H)
  const md = mc.x.createImageData(W, H), hd = hc.x.createImageData(W, H)
  const cx = W / 2, cy = H / 2, ex = W / 2 - R, ey = H / 2 - R
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, qx = Math.abs(dx) - ex, qy = Math.abs(dy) - ey
    let d: number, nx: number, ny: number
    if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy) || 1; d = R - l; nx = (Math.sign(dx) * qx) / l; ny = (Math.sign(dy) * qy) / l }
    else if (qx > qy) { d = R - qx; nx = Math.sign(dx); ny = 0 }
    else { d = R - qy; nx = 0; ny = Math.sign(dy) }
    px(md.data, hd.data, (y * W + x) * 4, d, nx, ny, B, lens ? (-lens * dx) / cx : 0, lens ? (-lens * dy) / cy : 0)
  }
  mc.x.putImageData(md, 0, 0); hc.x.putImageData(hd, 0, 0)
  const m = { map: mc.c.toDataURL(), hl: hc.c.toDataURL() }
  if (cache.size > 400) cache.clear()
  cache.set(key, m)
  return m
}

function dt1(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array) {
  let k = 0
  v[0] = 0; z[0] = -1e20; z[1] = 1e20
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
    while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]) }
    k++; v[k] = q; z[k] = s; z[k + 1] = 1e20
  }
  k = 0
  for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]] }
}

/** Exact squared Euclidean distance transform (Felzenszwalb), in place. */
function edt(f: Float64Array, W: number, H: number) {
  const n = Math.max(W, H), g = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1)
  for (let x = 0; x < W; x++) { for (let y = 0; y < H; y++) g[y] = f[y * W + x]; dt1(g, H, d, v, z); for (let y = 0; y < H; y++) f[y * W + x] = d[y] }
  for (let y = 0; y < H; y++) { for (let x = 0; x < W; x++) g[x] = f[y * W + x]; dt1(g, W, d, v, z); for (let x = 0; x < W; x++) f[y * W + x] = d[x] }
}

export interface GlyphMaps extends Maps {
  w: number; h: number; pad: number; asc: number; adv: number; mask: string
  /** Signed distance to the glyph's edge in native px (negative inside), W×H at `dpr` px per native px. */
  sd: Float32Array; W: number; H: number; dpr: number
}

/** One glyph: mask, displacement map and rim light, all from the same canvas so they stay aligned. */
export function glyphMaps(ch: string, size: number, stretch: CanvasFontStretch, bevel: number): GlyphMaps {
  const dpr = Math.min(1.5, window.devicePixelRatio || 1)
  const font = `800 ${size}px Archivo`
  const { c, x } = canvas(4, 4)
  const setFont = () => { x.font = font; x.fontStretch = stretch }
  setFont()
  const mt = x.measureText(ch), asc = size * 0.96, desc = size * 0.26, pad = Math.ceil(bevel + 8)
  const w = Math.ceil(mt.width + pad * 2), h = Math.ceil(asc + desc + pad * 2), W = Math.ceil(w * dpr), H = Math.ceil(h * dpr)
  c.width = W; c.height = H; setFont()
  x.setTransform(dpr, 0, 0, dpr, 0, 0); x.fillStyle = '#fff'; x.fillText(ch, pad, pad + asc)
  const a = x.getImageData(0, 0, W, H).data, f = new Float64Array(W * H), fo = new Float64Array(W * H)
  for (let i = 0; i < W * H; i++) { const inside = a[i * 4 + 3] > 127; f[i] = inside ? 1e20 : 0; fo[i] = inside ? 0 : 1e20 }
  edt(f, W, H); edt(fo, W, H)
  const D = new Float32Array(W * H), sd = new Float32Array(W * H)
  for (let i = 0; i < W * H; i++) {
    D[i] = Math.sqrt(f[i]) - 0.5
    sd[i] = (D[i] >= 0 ? -D[i] : Math.sqrt(fo[i]) - 0.5) / dpr
  }
  const mc = canvas(W, H), hc = canvas(W, H), md = mc.x.createImageData(W, H), hd = hc.x.createImageData(W, H)
  const B = bevel * dpr
  for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
    const i = y * W + xx, o = i * 4
    if (D[i] < 0) { md.data[o] = md.data[o + 1] = md.data[o + 2] = 128; md.data[o + 3] = 255; continue }
    const gx = (D[Math.min(i + 1, y * W + W - 1)] - D[Math.max(i - 1, y * W)]) / 2
    const gy = (D[Math.min(i + W, W * H - 1)] - D[Math.max(i - W, 0)]) / 2
    const l = Math.hypot(gx, gy) || 1
    px(md.data, hd.data, o, D[i] / dpr, -gx / l, -gy / l, B / dpr, 0, 0)
  }
  mc.x.putImageData(md, 0, 0); hc.x.putImageData(hd, 0, 0)
  return { w, h, pad, asc, adv: mt.width, mask: c.toDataURL(), map: mc.c.toDataURL(), hl: hc.c.toDataURL(), sd, W, H, dpr }
}

export interface GlassOptions {
  glyph?: boolean
  circle?: boolean
  lens?: number
  bevel?: number
  scale?: number
  tint?: number
  sat?: number
  cls?: string
  back?: string[]
  /** A symbol drawn unrefracted inside a circle (the orb's next photo). */
  inner?: string
}

let GID = 0

export class Glass {
  readonly el: HTMLDivElement
  readonly gc: HTMLDivElement
  X = 0
  Y = 0
  S = 1
  w = -1
  h = -1
  private r = -1
  private sc = 0
  private ta = -1
  private uses: SVGUseElement[] = []
  private mp: Maps | null = null
  private g: GlyphMaps | null = null
  private readonly o: GlassOptions
  private readonly svg: SVGSVGElement
  private readonly filter: SVGFilterElement
  private readonly fimg: SVGFEImageElement
  private readonly disp: SVGFEDisplacementMapElement[]
  private readonly clone: SVGGElement
  private readonly tintEl: SVGRectElement
  private readonly hl: SVGImageElement
  private readonly clip: SVGRectElement | null
  private readonly mimg: SVGImageElement | null
  private readonly icc: SVGCircleElement | null
  private readonly iu: SVGUseElement | null

  constructor(parent: Element, o: GlassOptions = {}) {
    this.o = o
    const id = `tg${++GID}`
    const el = (this.el = mk('div', 'glass abs ' + (o.glyph ? 'gly' : 'rr') + (o.cls ? ' ' + o.cls : ''), parent))
    el.innerHTML = `<svg class="gs" xmlns="${SVG_NS}">
      <defs>
        <filter id="${id}f" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feImage class="fmap" result="map" preserveAspectRatio="none"/>
          <feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="G" result="d1"/>
          <feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="G" result="d2"/>
          <feDisplacementMap in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="G" result="d3"/>
          <feColorMatrix in="d1" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="c1"/>
          <feColorMatrix in="d2" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="c2"/>
          <feColorMatrix in="d3" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="c3"/>
          <feBlend in="c1" in2="c2" mode="screen" result="c12"/>
          <feBlend in="c12" in2="c3" mode="screen" result="rgb"/>
          <feColorMatrix in="rgb" type="saturate" values="${o.sat ?? 1.3}"/>
        </filter>
        ${o.glyph ? `<mask id="${id}m" maskUnits="userSpaceOnUse" style="mask-type:alpha"><image class="gmask" preserveAspectRatio="none"/></mask>`
                  : `<clipPath id="${id}c"><rect class="gclip"/></clipPath>`}
        ${o.inner ? `<clipPath id="${id}i"><circle class="gicc" r="0"/></clipPath>` : ''}
      </defs>
      <g ${o.glyph ? `mask="url(#${id}m)"` : `clip-path="url(#${id}c)"`}>
        <g filter="url(#${id}f)"><g class="gclone"></g></g>
        <rect class="gtint" fill="#fff" fill-opacity="${o.tint ?? 0.08}"/>
        ${o.inner ? `<g clip-path="url(#${id}i)"><use class="giu" href="#${o.inner}"/></g>` : ''}
        <image class="ghl" preserveAspectRatio="none"/>
      </g></svg><div class="gc"></div>`
    const q = <T extends Element>(s: string) => el.querySelector(s) as T
    this.svg = q<SVGSVGElement>('.gs')
    this.filter = q<SVGFilterElement>('filter')
    this.fimg = q<SVGFEImageElement>('.fmap')
    this.disp = [...el.querySelectorAll('feDisplacementMap')]
    this.clone = q<SVGGElement>('.gclone')
    this.tintEl = q<SVGRectElement>('.gtint')
    this.hl = q<SVGImageElement>('.ghl')
    this.gc = q<HTMLDivElement>('.gc')
    this.clip = el.querySelector('.gclip')
    this.mimg = el.querySelector('.gmask')
    this.icc = el.querySelector('.gicc')
    this.iu = el.querySelector('.giu')
    this.scale(o.scale ?? 36)
    if (o.back) this.backdrop(o.back)
  }

  scale(s: number) {
    s = Math.round(s)
    if (s === this.sc) return
    this.sc = s
    this.disp[0].setAttribute('scale', String(s))
    this.disp[1].setAttribute('scale', String(s * 0.9))
    this.disp[2].setAttribute('scale', String(s * 0.8))
    this.region()
  }

  backdrop(syms: string[]) {
    this.clone.innerHTML = syms.map(s => `<use href="#${s}"/>`).join('')
    this.uses = [...this.clone.children] as SVGUseElement[]
  }

  private region() {
    if (this.w < 0) return
    const p = this.sc + 4
    attrs(this.filter, { x: -p, y: -p, width: this.w + 2 * p, height: this.h + 2 * p })
  }

  /** Native size in px. Rounded-rect maps are regenerated (and cached) as the size changes. */
  size(w: number, h: number, r: number) {
    w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h)); r = Math.round(r * 2) / 2
    if (w === this.w && h === this.h && r === this.r) return
    this.w = w; this.h = h; this.r = r
    attrs(this.svg, { width: w, height: h })
    this.el.style.width = w + 'px'
    this.el.style.height = h + 'px'
    this.region()
    attrs(this.tintEl, { width: w, height: h })
    const box = { x: 0, y: 0, width: w, height: h }
    attrs(this.fimg, box); attrs(this.hl, box)
    if (this.o.glyph) { if (this.mimg) attrs(this.mimg, box); return }
    if (this.clip) attrs(this.clip, { width: w, height: h, rx: r, ry: r })
    this.el.style.borderRadius = r + 'px'
    const mp = this.o.circle ? rrMaps(480, 480, 240, 84, this.o.lens ?? 0) : rrMaps(w, h, r, this.o.bevel ?? 16, this.o.lens ?? 0)
    if (mp !== this.mp) { this.mp = mp; this.fimg.setAttribute('href', mp.map); this.hl.setAttribute('href', mp.hl) }
  }

  glyph(g: GlyphMaps) {
    if (this.g === g) return
    this.g = g
    this.w = -1
    this.size(g.w, g.h, 0)
    this.fimg.setAttribute('href', g.map)
    this.hl.setAttribute('href', g.hl)
    this.mimg?.setAttribute('href', g.mask)
  }

  tint(a: number) {
    a = Math.round(a * 100) / 100
    if (a !== this.ta) { this.ta = a; this.tintEl.setAttribute('fill-opacity', String(a)) }
  }

  place(X: number, Y: number, S = 1) {
    this.X = X; this.Y = Y; this.S = S
    this.el.style.transform = `translate(${X}px,${Y}px)` + (S !== 1 ? ` scale(${S})` : '')
  }

  /** Align backdrop clone i with where that backdrop sits, in the parent's coordinates. */
  back(i: number, x: number, y: number, w: number, h: number) {
    const S = this.S || 1
    attrs(this.uses[i], { x: (x - this.X) / S, y: (y - this.Y) / S, width: w / S, height: h / S })
  }

  innerAt(r: number, x: number, y: number, w: number, h: number) {
    if (!this.icc || !this.iu) return
    const S = this.S || 1
    attrs(this.icc, { cx: this.w / 2, cy: this.h / 2, r: Math.max(0, r / S) })
    attrs(this.iu, { x: (x - this.X) / S, y: (y - this.Y) / S, width: w / S, height: h / S })
  }
}
