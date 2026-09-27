/**
 * layout.ts — every size and position that depends on the viewport, computed on mount and on
 * resize. Distances are in `u` (a thousandth of the viewport's short side) so the film scales;
 * the window's contents use `wu`, derived from the window's own size.
 */

import { baselineOf, measureSpan, textW } from './dom'
import { clamp } from './math'
import { glyphMaps, type GlyphMaps } from './glass'
import { MAX_LETTERS } from './glassWordGL'
import type { Take } from './Take'
import { T_END } from './timeline'

// grid cell per tile, and how it unfolds from its neighbour: [beat, axis, fold on the far side]
export const GRID: readonly [number, number][] = [[0, 0], [1, 0], [-1, 0], [0, -1], [0, 1], [1, -1], [-1, -1], [1, 1], [-1, 1]]
export const UNFOLD: readonly ([number, 'x' | 'y', 0 | 1] | null)[] = [null, [10, 'x', 0], [10, 'x', 1], [10, 'y', 1], [10, 'y', 0], [10.75, 'y', 1], [10.75, 'y', 1], [10.75, 'y', 0], [10.75, 'y', 0]]
const BENTO_L: readonly number[][] = [[0, 0, 2, 2], [2, 0, 2, 1], [4, 0, 1, 2], [2, 1, 1, 1], [3, 1, 1, 1], [0, 2, 1, 1], [1, 2, 1, 1], [2, 2, 2, 1], [4, 2, 1, 1]]
const BENTO_P: readonly number[][] = [[0, 0, 2, 2], [2, 0, 1, 2], [0, 2, 1, 1], [1, 2, 2, 1], [0, 3, 1, 1], [1, 3, 1, 1], [2, 3, 1, 1], [0, 4, 2, 1], [2, 4, 1, 1]]

export interface Box { x: number; y: number; w: number; h: number }
export interface BentoBox extends Box { cx: number; cy: number; big: boolean }

const glyphCache = new Map<string, GlyphMaps>()
function glyph(ch: string, size: number, stretch: CanvasFontStretch, bevel: number): GlyphMaps {
  const key = `${ch}|${Math.round(size)}|${stretch}`
  let g = glyphCache.get(key)
  if (!g) { g = glyphMaps(ch, Math.round(size), stretch, bevel); glyphCache.set(key, g) }
  return g
}

const actx = document.createElement('canvas').getContext('2d')
/** Advance width of Archivo 800 at a stretch, as the glyph canvas will draw it. */
function advance(text: string, size: number, stretch: CanvasFontStretch): number {
  if (!actx) return text.length * size * 0.7
  actx.font = `800 ${size}px Archivo`
  actx.fontStretch = stretch
  return actx.measureText(text).width
}

/** Bento cells for the featured tiles: the designed templates for nine, a plain grid otherwise. */
function bentoCells(n: number, land: boolean): number[][] {
  if (n === 9) return [...(land ? BENTO_L : BENTO_P)]
  const cols = land ? Math.min(4, Math.max(2, Math.ceil(n / 2))) : 2
  return Array.from({ length: n }, (_, i) => [i % cols, Math.floor(i / cols), 1, 1])
}

export function computeLayout(k: Take) {
  const { E, c } = k
  const vw = window.innerWidth, vh = window.innerHeight
  const u = Math.min(vw, vh) / 1000, cx = vw / 2, cy = vh / 2, land = vw / vh > 1.05
  const BEAT_PX = clamp(vh * 0.15, 100, 170)
  const hyp = Math.hypot(vw, vh)
  // the page is as long as the take (plus room to loop), so touch and the scrollbar can scrub it
  E.scroller.style.height = (T_END + 1.5) * BEAT_PX + vh + 'px'
  const root = k.root.style

  // wordmark: every letter measured at both ends of the width axis
  const base = 'font-family:Archivo;font-weight:800;font-size:100px;'
  const chars = [...c.wordmark]
  const W125 = chars.map(ch => measureSpan(ch, base + 'font-stretch:125%'))
  const W62 = chars.map(ch => measureSpan(ch, base + 'font-stretch:62%'))
  const trk = -0.02
  const sum = W125.reduce((a, b) => a + b, 0) + trk * 100 * (chars.length - 1) + 3.5 + 20
  const F = (Math.min(vw * 0.84, vh * 1.45) / sum) * 100
  const bl = (baselineOf(base + 'font-stretch:125%') / 100) * F
  const total = (sum * F) / 100, baseY = cy + 0.36 * F
  const wxs: number[] = []
  let x = cx - total / 2
  for (let i = 0; i < chars.length; i++) { wxs.push(x); x += (W125[i] * F) / 100 + trk * F }
  const dd = 0.2 * F, dotL = x + 0.035 * F - trk * F
  const wm = { F, w: W125.map(v => (v * F) / 100), nw: W62.map(v => (v * F) / 100), x: wxs, xd: dotL, top: baseY - bl }
  E.letters.forEach(s => { s.style.fontSize = F + 'px' })

  // pill
  const pillH = 128 * u, pf = 38 * u, pfont = `500 ${pf}px Geist`
  const pillW1 = textW(c.role, pfont) + 112 * u, pillW2 = textW(c.tagline, pfont) + 112 * u
  const t0 = E.tiles[0]
  if (t0?.l1 && t0.l2) { t0.l1.w.style.fontSize = pf + 'px'; t0.l2.w.style.fontSize = pf + 'px' }
  const D = Math.min(520 * u, Math.min(vw, vh) * 0.7)

  // grid and bento
  const g = 14 * u, S = (Math.min(vw, vh) * 0.74 - 2 * g) / 3, rT = 18 * u
  const grid: Box[] = GRID.map(([cc, r]) => ({ x: cx + cc * (S + g) - S / 2, y: cy + r * (S + g) - S / 2, w: S, h: S }))
  const nT = E.tiles.length
  const cells = bentoCells(nT, land)
  const cols = Math.max(...cells.map(q => q[0] + q[2])), rows = Math.max(...cells.map(q => q[1] + q[3]))
  const top = 104, bottom = 64, side = Math.max(16, vw * 0.05)
  const cw = (vw - side * 2 - (cols - 1) * g) / cols, ch = (vh - top - bottom - (rows - 1) * g) / rows
  const bento: BentoBox[] = cells.map(([bc, br, bw, bh]) => {
    const o = { x: side + bc * (cw + g), y: top + br * (ch + g), w: bw * cw + (bw - 1) * g, h: bh * ch + (bh - 1) * g }
    return { ...o, cx: o.x + o.w / 2, cy: o.y + o.h / 2, big: bw > 1 || bh > 1 }
  })
  root.setProperty('--capn', Math.max(10, 12 * u) + 'px'); root.setProperty('--capt', Math.max(14, 21 * u) + 'px'); root.setProperty('--caps', Math.max(11, 14 * u) + 'px')
  E.tiles.forEach((o, i) => { o.sub.w.style.display = bento[i].big ? '' : 'none'; o.cap.style.padding = `${36 * u}px ${16 * u}px ${14 * u}px ${16 * u}px` })
  ;[E.workHead, E.workCount].forEach(m => { m.w.style.fontSize = Math.max(11, 13 * u) + 'px' })

  // case study
  const tbY = vh - 96 * u
  const trackL = cx - 250 * u, trackR = cx + 230 * u, adjX = cx + 174 * u
  const title = k.c.projects[0]?.title ?? ''
  const cf = Math.min(vh * 0.3, (vw * 0.72 * 100) / Math.max(1, advance(title, 100, 'expanded')))
  const wBase = vh * 0.47 + 0.36 * cf
  const glyphs = [...title].filter(chr => chr !== ' ').map(chr => glyph(chr, cf, 'expanded', cf * 0.045))
  E.word.forEach((gl, i) => { gl.glyph(glyphs[i]); gl.scale(cf * 0.16) })
  let wordGL = false
  if (E.wordGL && glyphs.length && glyphs.length <= MAX_LETTERS) {
    E.wordGL.resize(vw, vh)
    try { E.wordGL.glyphs(glyphs, cf * 0.18); wordGL = true } catch { wordGL = false }
  }
  const spaceAdv = advance(' ', cf, 'expanded')
  const titleAdv = [...title].reduce((a, chr, i) => a + (chr === ' ' ? spaceAdv : glyphs[[...title].slice(0, i).filter(q => q !== ' ').length].adv), 0)
  let pen = cx - titleAdv / 2, gi = 0
  const cwords: { X0: number; Y0: number; cxL: number; cyL: number }[] = []
  for (const chr of title) {
    if (chr === ' ') { pen += spaceAdv; continue }
    const gm = glyphs[gi++]
    cwords.push({ X0: pen - gm.pad, Y0: wBase - gm.pad - gm.asc, cxL: pen + gm.adv / 2, cyL: wBase - 0.36 * cf })
    pen += gm.adv
  }
  const cwCy = wBase - 0.36 * cf
  root.setProperty('--tbf', `${20 * u}px/1.1`)
  E.tbIcons.forEach(e => { e.style.width = e.style.height = 26 * u + 'px' })
  ;[E.slRaw, E.slTri].forEach(m => { m.w.style.fontSize = 15 * u + 'px' })
  E.csub.w.style.font = `500 ${Math.max(15, 30 * u)}px/1.15 var(--ui)`
  E.cmeta.w.style.fontSize = Math.max(11, 14 * u) + 'px'
  const iu = Math.max(u, 0.55), infoX = Math.max(20, vw * 0.06)
  const kickF = Math.max(11, 13 * u), hF = Math.max(20, 40 * u), pF = Math.max(13, 16.5 * u)
  E.info[0].w.style.font = `500 ${kickF}px/1.2 var(--mono)`
  E.info[1].w.style.font = E.info[2].w.style.font = `600 ${hF}px/1.08 var(--ui)`
  E.leadP.style.font = `400 ${pF}px/1.4 var(--ui)`
  const leadW = Math.min(460 * iu, vw - infoX * 2)
  E.leadP.style.width = leadW + 'px'
  E.tagsL.w.style.font = E.caseLink.w.style.font = `500 ${kickF}px/1.2 var(--mono)`
  // wrapped lines, estimated with some slack for word breaks
  const leadLines = Math.max(1, Math.ceil(textW(k.c.lead, `400 ${pF}px Geist`) / (leadW * 0.84)))
  const infoY0 = 104
  const infoY = [infoY0, infoY0 + 26 * iu, infoY0 + 26 * iu + hF * 1.1]
  const leadY = infoY[2] + hF * 1.1 + 16 * iu
  const tagsY = leadY + leadLines * pF * 1.4 + 14 * iu
  const linkY = tagsY + kickF * 1.2 + 14 * iu
  const resY0 = linkY + 48 * iu, resDY = Math.max(60, 92 * u)
  E.res.forEach(r => { r.a.w.style.fontSize = Math.max(24, 46 * u) + 'px'; r.b.w.style.font = `500 ${Math.max(11, 14 * u)}px/1.2 var(--ui)` })

  // lock screen
  const kFull = Math.min(vh / 900, vw / 440)
  const df = 132 * kFull
  const dg: Record<string, GlyphMaps> = {}
  for (const chr of '0123456789:') dg[chr] = glyph(chr, df, 'normal', df * 0.05)
  E.cards.forEach(cd => {
    const K = kFull
    cd.gl.size(360 * K, 78 * K, 24 * K)
    cd.ic.style.cssText = `transform:translate(${16 * K}px,${20 * K}px);width:${38 * K}px;height:${38 * K}px;--icf:${10 * K}px`
    cd.k.style.cssText = `transform:translate(${66 * K}px,${19 * K}px);font-size:${10.5 * K}px`
    cd.v.style.cssText = `transform:translate(${66 * K}px,${37 * K}px);font-size:${15 * K}px;max-width:${230 * K}px`
    cd.tm.style.cssText = `transform:translate(${316 * K}px,${19 * K}px);font-size:${10.5 * K}px`
  })

  // phone and window
  let phone: Box & { r: number }, win: Box
  if (land) {
    const ph = vh * 0.76, pw = ph * 0.462
    phone = { x: vw * 0.25 - pw / 2, y: vh * 0.515 - ph / 2, w: pw, h: ph, r: pw * 0.13 }
    const wx = Math.max(phone.x + pw + vw * 0.06, vw * 0.4), wr = vw - Math.max(24, vw * 0.05), wwid = wr - wx, wh = Math.min(vh * 0.7, wwid * 0.74)
    win = { x: wx, y: vh * 0.52 - wh / 2, w: wwid, h: wh }
  } else {
    const ph = vh * 0.36, pw = ph * 0.462
    phone = { x: cx - pw / 2, y: vh * 0.08, w: pw, h: ph, r: pw * 0.13 }
    const wwid = vw - 32, wh = Math.min(vh * 0.46, wwid * 1.05)
    win = { x: 16, y: vh * 0.48, w: wwid, h: wh }
  }
  const wu = Math.min(win.w / 1000, win.h / 700) * 1.25
  const th = 44 * wu, hh = 58 * wu
  E.win.style.borderRadius = 12 * wu + 'px'
  E.hdrWm.w.style.fontSize = 21 * wu + 'px'
  E.nav.forEach(m => { m.w.style.fontSize = 13 * wu + 'px' })
  E.expH.w.style.fontSize = 40 * wu + 'px'; E.expS.w.style.fontSize = 14 * wu + 'px'
  E.years.forEach(m => { m.w.style.fontSize = 11 * wu + 'px' })
  E.rows.forEach(r => { r.a.w.style.fontSize = 13.5 * wu + 'px'; r.b.w.style.fontSize = 10.5 * wu + 'px' })
  E.abH.w.style.fontSize = 30 * wu + 'px'
  E.abB.style.font = `400 ${15 * wu}px/1.45 var(--ui)`; E.abB.style.width = win.w - 72 * wu + 'px'
  E.prName.w.style.fontSize = 28 * wu + 'px'; E.prRole.w.style.fontSize = 14 * wu + 'px'
  E.prStack.forEach(m => { m.w.style.fontSize = 11 * wu + 'px' }); E.prEng.w.style.fontSize = 11 * wu + 'px'
  E.prSkills.forEach(m => { m.w.style.fontSize = 13.5 * wu + 'px' })
  root.setProperty('--tabf', 12 * wu + 'px'); root.setProperty('--segf', 13 * wu + 'px')
  E.urlT.forEach(m => { m.w.style.fontSize = 11 * wu + 'px' })
  const pageTop = th + hh, pageH = win.h - pageTop
  const col0 = 36 * wu, labW = 250 * wu, barX0 = col0 + labW, barX1 = win.w - 36 * wu
  const rowY0 = 146 * wu, rowDY = Math.min(50 * wu, (pageH - rowY0 - 24 * wu) / Math.max(1, E.rows.length))
  const heroH = pageH * 0.46
  const prX = win.w * 0.52
  const prIH = Math.min(pageH * 0.64, (win.w * 0.32) / 0.74), prIW = prIH * 0.74  // the print and its frame stay left of the product column
  const prCx = win.w * 0.27, prCy = pageTop + pageH * 0.5
  const mat = prIH * 0.07, mold = prIH * 0.035
  const prY = pageTop + pageH * 0.16
  const swY = prY + 130 * wu, swD = 26 * wu
  const segY = swY + 108 * wu, segW = Math.min(280 * wu, win.w - prX - 36 * wu), segH = 40 * wu
  const ctaSlot = { cx: win.x + prX + 125 * wu, cy: win.y + segY + segH + 38 * wu + 27 * wu, w: 250 * wu, h: 54 * wu }
  const navSlot = { cx: win.x + win.w - 36 * wu - 50 * wu, cy: win.y + th + hh / 2, w: 100 * wu, h: 34 * wu }
  const tab0 = win.x + 90 * wu, tabW = 96 * wu
  const tabAbout = { x: tab0 + tabW * 1.5 + 8 * wu, y: win.y + th / 2 }
  E.ctaLb.contact.w.style.fontSize = 13 * wu + 'px'; E.ctaLb.touch.w.style.fontSize = 17 * wu + 'px'
  E.ctaLb.sent.w.style.fontSize = E.ctaLb.read.w.style.fontSize = 34 * u + 'px'; E.ctaLb.done.w.style.fontSize = 17 * u + 'px'
  E.ctaLb.pct.w.style.fontSize = 30 * u + 'px'; E.ctaLb.way.w.style.fontSize = 24 * u + 'px'
  E.ctaLb.from.w.style.fontSize = E.ctaLb.to.w.style.fontSize = 14 * u + 'px'

  // wall
  const ih = land ? vh * 0.46 : vh * 0.34
  const fc = land ? { x: vw * 0.41, y: vh * 0.48 } : { x: cx, y: vh * 0.34 }
  const print = { w: ih * 0.76, h: ih, x: 0, y: 0 }
  print.x = fc.x - print.w / 2; print.y = fc.y - print.h / 2
  const wm2 = print.h * 0.085, wg = print.h * 0.04
  const po = print.w / 2 + wm2 + wg
  const pw = Math.min(340 * u, vw - 32)
  const plc = land
    ? { x: fc.x + po + vw * 0.05, y: fc.y + print.h * 0.02 - 40 * u, w: Math.min(pw, vw - (fc.x + po + vw * 0.05) - 24) }
    : { x: cx - pw / 2, y: fc.y + print.h / 2 + wm2 + wg + 48 * u, w: pw }
  root.setProperty('--p1', Math.max(14, 17 * u) + 'px'); root.setProperty('--p2', Math.max(12, 13.5 * u) + 'px'); root.setProperty('--pg', 12 * u + 'px')
  E.placard.style.padding = `${20 * u}px ${22 * u}px`; E.placard.style.width = plc.w + 'px'

  return {
    vw, vh, u, cx, cy, land, BEAT_PX, hyp,
    wm, dd, dotCx: dotL + dd / 2, dotCy: baseY - dd / 2,
    pillH, pillW1, pillW2, D, g, S, rT, grid, bento, bentoTop: top, side,
    tbY, trackL, trackR, adjX, cf, cwords, cwCx: cx, cwCy, wBase, wordGL,
    infoX, infoY, leadY, tagsY, linkY, resY0, resDY,
    kFull, dg, df,
    phone, win, wu, th, hh, pageTop, pageH, col0, labW, barX0, barX1, rowY0, rowDY, heroH,
    prX, prIH, prIW, prCx, prCy, mat, mold, prY, swY, swD, segY, segW, segH, ctaSlot, navSlot, tab0, tabW, tabAbout,
    print, fc, wm2, wg, plc,
    cur: Math.max(0.8, (1.05 * u) / 0.9),
  }
}

export type Lay = ReturnType<typeof computeLayout>
