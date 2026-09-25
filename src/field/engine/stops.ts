/**
 * Stops: discovery from the DOM (data attributes, see contract.ts), measurement into scroll
 * anchors, and the scroll → progress mapping.
 *
 * Every stop gets an anchor range [anchor, end] in scroll pixels. While the (smoothed) scroll
 * position sits inside a stop's range, progress is exactly that stop's index; between one
 * stop's end and the next stop's anchor it travels linearly to the next integer.
 */
import type { FieldSide, ShapeId } from '../contract'
import { hexToRgb, clamp, type RGB } from './math'
import { liftTint, parseColorPair } from './colors'
import { SHAPES, resolveShape } from './shapes'

export interface StopSpec {
  key: string
  shape: ShapeId
  side: FieldSide
  /** Point tint (top, bottom), already lifted for visibility; null = plain aqua→peach palette. */
  tint: [RGB, RGB] | null
  /** Page gradient (top, bottom) while this stop is at rest. */
  bg: [RGB, RGB]
  clusterSizes: number[]
  rings: number
  el: HTMLElement
}

/** A cluster's spot box, in viewport pixels, as it will be when the stop is at its anchor. */
export interface SpotPx {
  cx: number
  cy: number
  size: number
  count: number
}

export interface StopGeom {
  anchor: number
  end: number
  /** clusters: one per cluster. */
  spots: SpotPx[]
  /**
   * helix and side (desktop): horizontal extent of the stop's text column (viewport px), to place
   * the shape in the free space beside it. Not finite when there was nothing to measure.
   */
  textLeft: number
  textRight: number
  /** helix: page-y centres of [data-field-ring] elements, by ring number (1-based). */
  rings: { n: number; y: number }[]
}

export interface ViewportInfo {
  w: number
  h: number
  mobile: boolean
  tablet: boolean
  maxScroll: number
}

const SIDES: readonly FieldSide[] = ['left', 'right', 'center', 'top']
const DEFAULT_SIDE: Record<string, FieldSide> = { hero: 'center', side: 'right', at: 'right', helix: 'right', clusters: 'center' }

function isRendered(el: Element): boolean {
  return el.getClientRects().length > 0
}

function parseInts(s: string | null | undefined): number[] {
  if (!s) return []
  return s.split(/[\s,]+/).map((v) => parseInt(v, 10)).filter((v) => Number.isFinite(v) && v > 0)
}

/** Read every rendered [data-field-stop] in document order. Duplicate keys get a numeric suffix. */
export function readStops(root: ParentNode = document): StopSpec[] {
  const out: StopSpec[] = []
  const seen = new Map<string, number>()
  root.querySelectorAll<HTMLElement>('[data-field-stop]').forEach((el) => {
    if (!isRendered(el)) return
    const shape = resolveShape(el.dataset.shape)
    const def = SHAPES[shape]
    let key = el.dataset.fieldStop || `${shape}`
    const dup = seen.get(key) ?? 0
    seen.set(key, dup + 1)
    if (dup) key = `${key}#${dup}`
    const sideAttr = el.dataset.side as FieldSide | undefined
    const side = sideAttr && SIDES.includes(sideAttr) ? sideAttr : DEFAULT_SIDE[def.layout]
    const tintRaw = parseColorPair(el.dataset.tint)
    const tint: [RGB, RGB] | null = tintRaw ? [liftTint(tintRaw[0]), liftTint(tintRaw[1])] : null
    const bg = parseColorPair(el.dataset.bg) ?? [hexToRgb(def.bg[0]), hexToRgb(def.bg[1])]
    let clusterSizes = parseInts(el.dataset.clusterSizes)
    if (shape === 'clusters' && !clusterSizes.length) {
      const groups = el.querySelectorAll('[data-field-cluster]')
      clusterSizes = groups.length ? Array.from(groups, (g) => Math.max(1, g.querySelectorAll('li').length || 3)) : [5, 4, 3, 5]
    }
    let rings = parseInts(el.dataset.rings)[0] ?? 0
    if (shape === 'helix' && !rings) rings = el.querySelectorAll('[data-field-ring]').length || 6
    out.push({ key, shape, side, tint, bg, clusterSizes, rings, el })
  })
  return out
}

/** Everything that changes what the engine must build. Equal signatures → only re-measure. */
export function stopsSignature(stops: StopSpec[]): string {
  return stops
    .map((s) => [s.key, s.shape, s.side, s.tint ? s.tint.flat().map((v) => v.toFixed(3)).join(',') : '-',
      s.bg.flat().map((v) => v.toFixed(3)).join(','), s.clusterSizes.join(','), s.rings].join('|'))
    .join(';')
}

export function readViewport(): ViewportInfo {
  const w = window.innerWidth
  const h = window.innerHeight
  const mobile = w < 900
  const de = document.documentElement
  return { w, h, mobile, tablet: mobile && w >= 600, maxScroll: Math.max(0, de.scrollHeight - h) }
}

function textExtent(el: HTMLElement): [number, number] {
  let left = Infinity
  let right = -Infinity
  const rg = document.createRange()
  el.querySelectorAll('h1, h2, h3, h4, p, li, dd, dt').forEach((e) => {
    rg.selectNodeContents(e)
    const r = rg.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) return
    left = Math.min(left, r.left)
    right = Math.max(right, r.right)
  })
  rg.detach()
  return [left, right]
}

/** A stop's text column: its [data-field-text] box (captions placed outside it don't count), else its text. */
function textColumn(el: HTMLElement): [number, number] {
  const col = el.querySelector<HTMLElement>('[data-field-text]')
  if (col && isRendered(col)) {
    const r = col.getBoundingClientRect()
    return [r.left, r.right]
  }
  return textExtent(el)
}

/** Measure anchors (and layout-driven geometry) for every stop. */
export function measureStops(stops: StopSpec[], vp: ViewportInfo): StopGeom[] {
  const H = vp.h
  const sy = window.scrollY
  const maxS = vp.maxScroll
  const geoms: StopGeom[] = []
  stops.forEach((s, k) => {
    const def = SHAPES[s.shape]
    const r = s.el.getBoundingClientRect()
    const top = r.top + sy
    const h = r.height
    let anchor = top + h / 2 - H / 2
    let end = anchor
    const g: StopGeom = { anchor, end, spots: [], textLeft: NaN, textRight: NaN, rings: [] }
    if (def.layout === 'helix') {
      let firstTop = Infinity
      s.el.querySelectorAll<HTMLElement>('[data-field-ring]').forEach((e) => {
        if (!isRendered(e)) return
        const rr = e.getBoundingClientRect()
        firstTop = Math.min(firstTop, rr.top + sy)
        g.rings.push({ n: parseInt(e.dataset.fieldRing || '0', 10) || g.rings.length + 1, y: rr.top + sy + rr.height / 2 })
      })
      if (g.rings.length) {
        // fully formed once the heading above the first ring is centred; holds until the last ring passes
        anchor = (top + firstTop) / 2 - H / 2
        end = Math.max(...g.rings.map((q) => q.y)) - H / 2
      } else if (h > H * 1.25) {
        anchor = top + 0.35 * H - H / 2
        end = top + h - 0.35 * H - H / 2
      }
      ;[g.textLeft, g.textRight] = textExtent(s.el)
    } else if (vp.mobile && def.layout === 'side') {
      // phones: the shape sits in the band above the copy, fully formed as the copy starts
      const a = s.el.querySelector<HTMLElement>('[data-field-anchor]') ?? (s.el.firstElementChild as HTMLElement | null)
      if (a) anchor = end = a.getBoundingClientRect().top + sy - H * (vp.tablet ? 0.5 : 0.52)
    } else if (def.layout !== 'hero' && h > H * 1.25) {
      anchor = top + 0.35 * H - H / 2
      end = top + h - 0.35 * H - H / 2
    }
    if (def.layout === 'side' && !vp.mobile) [g.textLeft, g.textRight] = textColumn(s.el)
    anchor = clamp(anchor, 0, maxS)
    end = clamp(Math.max(end, anchor), anchor, maxS)
    const prev = geoms[k - 1]
    if (prev && anchor <= prev.end) {
      anchor = prev.end + 1
      end = Math.max(end, anchor)
    }
    g.anchor = anchor
    g.end = end
    geoms.push(g)
  })
  // clusters are measured relative to their (final) anchor
  stops.forEach((s, k) => {
    if (SHAPES[s.shape].layout !== 'clusters') return
    const g = geoms[k]
    const n = s.clusterSizes.length
    for (let c = 1; c <= n; c++) {
      const grp = s.el.querySelector<HTMLElement>(`[data-field-cluster="${c}"]`)
      const spotEl = grp?.querySelector<HTMLElement>('[data-field-spot], .spot') ?? grp
      if (!spotEl || !isRendered(spotEl)) continue
      const sr = spotEl.getBoundingClientRect()
      g.spots.push({ cx: sr.left + sr.width / 2, cy: sr.top + sy + sr.height / 2 - g.anchor, size: Math.min(sr.width, sr.height), count: s.clusterSizes[c - 1] })
    }
    if (g.spots.length < n) {
      // nothing to measure: lay the clusters out on a grid inside the stop's box
      g.spots = []
      const sr = s.el.getBoundingClientRect()
      const cols = vp.mobile ? 1 : Math.min(n, 2)
      const rows = Math.ceil(n / cols)
      const cw = sr.width / cols
      const ch = Math.min(sr.height, H) / rows
      const top0 = sr.top + sy - g.anchor + Math.max(0, (sr.height - Math.min(sr.height, H)) / 2)
      for (let c = 0; c < n; c++) {
        g.spots.push({
          cx: sr.left + cw * ((c % cols) + 0.5),
          cy: top0 + ch * (Math.floor(c / cols) + 0.5),
          size: Math.min(cw, ch) * 0.7,
          count: s.clusterSizes[c],
        })
      }
    }
  })
  return geoms
}

/** Which pair of stops the scroll position sits between, and how far along (0..1). */
export function locate(geoms: StopGeom[], sp: number): { i: number; f: number } {
  const n = geoms.length
  if (n < 2) return { i: 0, f: 0 }
  let i = 0
  while (i < n - 2 && sp >= geoms[i + 1].anchor) i++
  const a0 = geoms[i].end
  const a1 = geoms[i + 1].anchor
  return { i, f: clamp((sp - a0) / Math.max(a1 - a0, 1), 0, 1) }
}
