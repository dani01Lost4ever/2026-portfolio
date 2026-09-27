/**
 * scenes.ts — seek(t): every style of the film as a function of t (beats). Each scene reads
 * the layout and writes transforms/sizes; nothing is kept between frames.
 *
 * Beat map: 0–9 open (wordmark → pill → iris), 9–18 work (grid unfolds, bento), 18–32 case
 * (glass word, toolbar, slider, orb), 32–38 now (lock screen), 38–54 stage (phone, island →
 * window, dragged wallpaper → framed print), 54–62 order (one black shape), 62–71.5 wall
 * (contact card on the wall, back to the wordmark). Frame T_END equals frame 0.
 */

import { at, boxC, boxTL, rise, riseKeep, show, type MLine } from './dom'
import { clamp, eio, lerp, lerpR, seg, smooth, SP, spr, track, type Rect } from './math'
import { setIris } from './iris'
import type { WordLetter } from './glassWordGL'
import { UNFOLD } from './layout'
import { BENTO_OPEN, CHAPTERS, T_END } from './timeline'
import type { Take } from './Take'

// ─── helpers shared by several scenes ───────────────────────────────────────────

/** Tile 0's rest box in the bento (a centred square if there are no projects at all). */
function bento0(k: Take) {
  const { L } = k
  return L.bento[0] ?? { x: L.cx - L.S / 2, y: L.cy - L.S / 2, w: L.S, h: L.S, cx: L.cx, cy: L.cy, big: false }
}

export function camAt(k: Take, t: number) {
  const { L } = k
  if (t >= 40 || t < 17.9) return { k: 1, tx: 0, ty: 0 }
  const p = spr(t, 18.0, SP.cam), B = bento0(k), k1 = Math.max(L.vw / B.w, L.vh / B.h) * 1.002
  const kk = Math.exp(Math.log(k1) * p)
  const sx = lerp(B.cx, L.cx, p), sy = lerp(B.cy, L.cy, p)
  return { k: kk, tx: sx - B.cx * kk, ty: sy - B.cy * kk }
}

/** Tile 0 is the period, the pill, the iris, the first tile, and at the very end the pill and period again. */
export function hsGeom(k: Take, t: number) {
  const { L } = k
  const { vw, vh, cx, cy } = L
  if (t >= 62) {
    const P = L.print, o = L.wm2 + L.wg
    const O = { x: P.x - o, y: P.y - o, w: P.w + 2 * o, h: P.h + 2 * o }
    const Cv = { x: -0.12 * vw, y: -0.12 * vh, w: 1.24 * vw, h: 1.24 * vh }
    const Pl = { x: cx - L.pillW1 / 2, y: cy - L.pillH / 2, w: L.pillW1, h: L.pillH }
    const Dt = { x: L.dotCx - L.dd / 2, y: L.dotCy - L.dd / 2, w: L.dd, h: L.dd }
    const q3 = spr(t, 68.6, SP.snap)
    let r: Rect = lerpR(P, O, spr(t, 67.9, SP.fast))
    r = lerpR(r, Cv, spr(t, 68.2, SP.fast)); r = lerpR(r, Pl, q3); r = lerpR(r, Dt, spr(t, 69.1, SP.close))
    return { x: r.x + r.w / 2, y: r.y + r.h / 2, w: r.w, h: r.h, r: (Math.min(r.w, r.h) / 2) * q3, sc: 1 }
  }
  const B = bento0(k)
  const x = track(t, L.dotCx, [[2.5, cx, SP.liq], [13.5, B.cx, SP.bento]])
  const y = track(t, L.dotCy, [[2.5, cy, SP.liq], [13.5, B.cy, SP.bento]])
  const w = track(t, L.dd, [[2.5, L.pillW1, SP.liq], [5.0, L.pillW2], [7.0, L.D], [9.5, L.S], [13.5, B.w, SP.bento]])
  const h = track(t, L.dd, [[2.5, L.pillH, SP.liq], [7.0, L.D], [9.5, L.S], [13.5, B.h, SP.bento]])
  const r = lerp(Math.min(w, h) / 2, L.rT, spr(t, 9.0)) * (1 - spr(t, 18.0, SP.cam))
  const sc = 1 - 0.05 * (spr(t, 6.75, SP.fast) - spr(t, 6.95))
  return { x, y, w, h, r, sc }
}

export function tile0Screen(k: Take, t: number): Rect {
  const c = camAt(k, t), g = hsGeom(k, t)
  return { x: c.tx + (g.x - g.w / 2) * c.k, y: c.ty + (g.y - g.h / 2) * c.k, w: g.w * c.k, h: g.h * c.k }
}

export const knobX = (k: Take, t: number) =>
  t < 26.6 ? track(t, k.L.adjX, [[25.9, k.L.trackL]]) : lerp(k.L.trackL, k.L.trackR, eio(seg(t, 26.6, 28.6)))

export function lockRect(k: Take, t: number) {
  const { L } = k
  const P = L.phone, p = spr(t, 38.0, SP.cam)
  return { x: lerp(0, P.x, p), y: lerp(0, P.y, p), w: lerp(L.vw, P.w, p), h: lerp(L.vh, P.h, p), r: lerp(0, P.r, p) }
}

// ─── open + work (world space, behind a camera) ───────────────────────────────────

function fOf(t: number) {
  if (t < 60) return 1 - spr(t, 1.0, SP.squeeze)
  const f = spr(t, 69.6, SP.pop)
  return f + (1 - f) * seg(t, 71.0, 71.45)
}

function sceneWord(k: Take, t: number) {
  const { E, L } = k, W = L.wm
  const f = fOf(t), vis = f > 0.003
  show(E.wm, vis)
  if (!vis) return
  for (let i = 0; i < E.letters.length; i++) {
    const s = E.letters[i], wi = W.w[i], ni = W.nw[i]
    const left = W.xd - (W.xd - W.x[i]) * f, tw = wi * f
    // narrow the width axis first, then scale what is left, so the letters stay touching
    const st = clamp(62 + (63 * (tw - ni)) / (wi - ni || 1), 62, 125), aw = ni + ((wi - ni) * (st - 62)) / 63
    s.style.fontStretch = st.toFixed(2) + '%'
    s.style.transform = `translate(${left}px,${W.top}px) scaleX(${(tw / (aw || 1)).toFixed(4)})`
  }
}

function caps(k: Take, i: number, t: number) {
  const o = k.E.tiles[i]
  riseKeep(o.num, t, 11.5 + 0.05 * i, 17.75); riseKeep(o.title, t, 11.6 + 0.05 * i, 17.75)
  if (k.L.bento[i].big) riseKeep(o.sub, t, 14.5 + 0.05 * i, 17.75)
}

function sceneWorld(k: Take, t: number) {
  const { E, L } = k
  const vis = t < 32.4 || t >= 67.85
  show(E.world, vis)
  if (!vis) return
  const c = camAt(k, t)
  E.world.style.transform = c.k === 1 ? '' : `translate(${c.tx}px,${c.ty}px) scale(${c.k})`
  sceneWord(k, t)
  const o = E.tiles[0]
  if (o) {
    const g = hsGeom(k, t), late = t >= 62
    boxC(o.el, g.x, g.y, g.w, g.h, g.sc); o.el.style.borderRadius = g.r + 'px'
    show(o.poster, t >= 7.6 && !late)
    if (o.l1 && o.l2) { rise(o.l1, late ? -1 : t, 3.5, 5.0); rise(o.l2, late || t >= 7.6 ? -1e3 : t, 5.1, null) }
    if (o.iris) { if (late) show(o.iris.s, false); else setIris(o.iris, g.w, g.h, track(t, 1, [[7.0, 0, SP.close], [8.0, 1, { r: 0.45, d: 0.6 }]])) }
    show(o.cap, t >= 7.6 && !late)
    caps(k, 0, t)
  }
  for (let i = 1; i < E.tiles.length; i++) {
    const o = E.tiles[i], uf = UNFOLD[i]
    if (!uf) continue
    const [tu, ax, og] = uf, p = spr(t, tu, SP.unfold)
    const on = p > 0.002 && t < 32.4
    show(o.el, on)
    if (!on) continue
    const G = L.grid[i], B = L.bento[i], q = spr(t, 13.5 + 0.06 * i, SP.bento)
    const x = lerp(G.x, B.x, q), y = lerp(G.y, B.y, q), w = lerp(G.w, B.w, q), h = lerp(G.h, B.h, q)
    let sx = 1, sy = 1, ox = 0, oy = 0
    if (ax === 'x') { sx = p; ox = og ? w * (1 - p) : 0 } else { sy = p; oy = og ? h * (1 - p) : 0 }
    o.el.style.transform = `translate(${x + ox}px,${y + oy}px) scale(${sx},${sy})`
    o.el.style.width = w + 'px'; o.el.style.height = h + 'px'; o.el.style.borderRadius = L.rT + 'px'
    caps(k, i, t)
  }
  const click = t >= BENTO_OPEN[0] && t < BENTO_OPEN[1]
  if (click !== k.clickable) {
    k.clickable = click
    E.tiles.forEach(o => { o.el.classList.toggle('clickable', click); o.el.tabIndex = click ? 0 : -1 })
    E.allBtn.tabIndex = click ? 0 : -1
  }
  if (rise(E.workHead, t < 30 ? t : -1, 12.0, 17.75)) at(E.workHead.w, L.side, L.bentoTop - 14, 0, 1)
  if (rise(E.workCount, t < 30 ? t : -1, 12.15, 17.8)) at(E.workCount.w, L.vw - L.side, L.bentoTop - 14, 1, 1)
}

// the wipe between the two aligned shots of the case poster
function sceneWipe(k: Take, t: number) {
  const { E, L } = k
  if (!E.wipeRect || !E.wipeLine) return
  const p = t < 60 ? eio(seg(t, 26.6, 28.6)) : 0
  if (p <= 0) { E.wipeRect.setAttribute('width', '0'); E.wipeLine.setAttribute('x', '-4'); return }
  const T = tile0Screen(k, t), sg = Math.max(T.w, T.h) / 400, xs = p * L.vw
  const xp = (xs - (T.x + T.w / 2)) / sg + 200
  E.wipeRect.setAttribute('width', String(Math.max(0, xp + 10)))
  E.wipeLine.setAttribute('x', String(p < 1 ? xp - 0.7 : 500))
}

// ─── case study (screen space) ─────────────────────────────────────────────────

function sceneCase(k: Take, t: number) {
  const { E, L } = k
  const { vw, vh, u, cx, cy } = L
  const vis = t >= 18.4 && t < 32.4
  show(E.caseL, vis)
  if (!vis) { E.wordGL?.hide(); return }
  const T = tile0Screen(k, t)
  // glass word, letter by letter, then melting into one droplet: on the WebGL canvas when it is
  // ready (the melt is a smooth union there), else as SVG glass letters merged by the goo filter
  const useGL = L.wordGL && !!E.wordGL?.ready
  const goo = !useGL && t > 22.7 && t < 23.85
  E.gw.classList.toggle('goo', goo); E.gw.style.filter = goo ? 'url(#goo)' : ''
  const letters: WordLetter[] = []
  for (let i = 0; i < E.word.length; i++) {
    const gl = E.word[i], p = spr(t, 19 + 0.25 * i * (8 / Math.max(8, E.word.length)), SP.pop), m = spr(t, 22.75 + 0.03 * i, { r: 0.45, d: 1 })
    const on = p > 0.003 && m < 0.995
    const G = L.cwords[i], ccx = lerp(G.cxL, L.cwCx, m), ccy = lerp(G.cyL, L.cwCy, m), S = on ? p * (1 - m) : 0
    const X = ccx - (G.cxL - G.X0) * S, Y = ccy - (G.cyL - G.Y0) * S
    letters.push({ X, Y, S })
    show(gl.el, on && !useGL)
    if (!on || useGL) continue
    gl.place(X, Y, Math.max(S, 0.001))
    gl.back(0, T.x, T.y, T.w, T.h)
  }
  if (rise(E.csub, t, 21.25, 22.75)) at(E.csub.w, cx, L.wBase + 40 * u, 0.5, 0)
  if (rise(E.cmeta, t, 21.5, 22.8)) at(E.cmeta.w, cx, L.wBase + 40 * u + Math.max(24, 46 * u), 0.5, 0)

  // droplet → toolbar → slider
  const stch = 70 * u * (spr(t, 23.75, { r: 0.22, d: 1 }) - spr(t, 23.92, { r: 0.4, d: 0.65 }))
  const x = track(t, cx, [[30.5, L.trackR]]), y = track(t, L.cwCy, [[23.75, L.tbY, SP.liq]])
  const w = track(t, 0, [[23.0, 120 * u, SP.pop], [23.75, 560 * u, SP.liq], [25.75, 720 * u], [30.5, 0]]) - stch * 0.6
  const h = track(t, 0, [[23.0, 120 * u, SP.pop], [23.75, 84 * u, SP.liq], [25.75, 72 * u], [30.5, 0]]) + stch
  if (E.wordGL) {
    if (useGL) {
      // before it moves, the droplet is drawn with the letters so they can flow into it
      const sg = Math.max(T.w, T.h), side = sg
      E.wordGL.draw({
        letters, drop: t < 23.75 && w > 2 ? { x: cx, y: L.cwCy, r: Math.min(w, h) / 2 } : null,
        k: 70 * u * spr(t, 22.75, { r: 0.45, d: 1 }),
        back: { x: T.x + T.w / 2 - side / 2, y: T.y + T.h / 2 - side / 2, w: side, h: side },
        bevel: L.cf * 0.045, scale: L.cf * 0.16,
      })
    } else E.wordGL.hide()
  }
  const tbOn = w > 2 && h > 2 && !(useGL && t < 23.75)
  show(E.tb.el, tbOn)
  if (tbOn) {
    E.tb.size(w, h, Math.min(w, h) / 2); E.tb.place(x - E.tb.w / 2, y - E.tb.h / 2); E.tb.back(0, T.x, T.y, T.w, T.h)
    const bx = x - E.tb.w / 2, mid = E.tb.h / 2
    if (rise(E.tbLabel, t, 24.35, 25.6)) at(E.tbLabel.w, 30 * u, mid, 0, 0.5)
    const iconX = [w - 226 * u, w - 166 * u, w - 106 * u, w - 46 * u]
    E.tbIcons.forEach((ic, j) => {
      const s = spr(t, 24.5 + 0.18 * j, SP.pop) * (1 - spr(t, j === 2 ? 25.75 : 25.6))
      show(ic, s > 0.004)
      if (s > 0.004) ic.style.transform = `translate(${iconX[j] - 13 * u * s}px,${mid - 13 * u * s}px) scale(${s})`
    })
    const tp = spr(t, 25.9) * (1 - spr(t, 30.5)), kx = knobX(k, t)
    const a0 = lerp(L.adjX, L.trackL, tp), a1 = lerp(L.adjX, L.trackR, tp), th = 3 * u
    show(E.trackA, tp > 0.004); show(E.trackB, tp > 0.004)
    if (tp > 0.004) {
      boxTL(E.trackA, a0 - bx, mid - th / 2, Math.max(0, a1 - a0), th)
      boxTL(E.trackB, a0 - bx, mid - th / 2, Math.max(0, Math.min(kx, a1) - a0), th)
    }
    const ks = spr(t, 25.75, SP.pop) * (1 - spr(t, 26.45))
    show(E.knob, ks > 0.004)
    if (ks > 0.004) { const kd = 34 * u; boxTL(E.knob, kx - bx - kd / 2, mid - kd / 2, kd, kd); E.knob.style.transform += ` scale(${ks})` }
    if (rise(E.slRaw, t, 26.0, 30.5)) at(E.slRaw.w, L.trackL - 20 * u - bx, mid, 1, 0.5)
    if (rise(E.slTri, t, 26.05, 30.5)) at(E.slTri.w, L.trackR + 20 * u - bx, mid, 0, 0.5)
  }

  // knob → glass lens while held → orb → the next photo opens inside → lock screen
  const oOn = t >= 26.45
  show(E.orb.el, oOn)
  if (oOn) {
    const d = track(t, 34 * u, [[26.45, 150 * u, SP.pop], [30.5, 440 * u, { r: 0.6, d: 0.8 }], [31.75, 1.35 * L.hyp, SP.fast]])
    const lx = lerp(knobX(k, t), cx, spr(t, 30.5, SP.lift)), ly = lerp(L.tbY, cy, spr(t, 30.5, SP.lift))
    E.orb.scale(clamp(d * 0.16, 16, 90)); E.orb.size(d, d, d / 2); E.orb.place(lx - E.orb.w / 2, ly - E.orb.h / 2)
    E.orb.back(0, T.x, T.y, T.w, T.h)
    E.orb.innerAt((E.orb.w / 2) * 0.9 * spr(t, 31.0, SP.pop), 0, 0, vw, vh)
  }

  // copy: kicker, headline, lead, tags, link to the full case, then the results
  E.info.forEach((m, j) => { if (rise(m, t, 23.9 + 0.12 * j, 30.5 + 0.04 * j)) at(m.w, L.infoX, L.infoY[j], 0, 0) })
  blockRise(E.leadP, E.leadS, t, 24.3, 30.62, L.infoX, L.leadY)
  if (rise(E.tagsL, t, 24.45, 30.66)) at(E.tagsL.w, L.infoX, L.tagsY, 0, 0)
  if (rise(E.caseLink, t, 24.6, 30.7)) at(E.caseLink.w, L.infoX, L.linkY, 0, 0)
  E.res.forEach((r, j) => {
    const ry = L.resY0 + j * L.resDY
    if (rise(r.a, t, 28.8 + 0.25 * j, 30.6 + 0.05 * j)) at(r.a.w, L.infoX, ry, 0, 0)
    if (rise(r.b, t, 28.9 + 0.25 * j, 30.65 + 0.05 * j)) at(r.b.w, L.infoX, ry + Math.max(28, 50 * u), 0, 0)
  })
}

/** A wrapping paragraph that rises out of its own mask like a line. */
function blockRise(w: HTMLElement, s: HTMLElement, t: number, tin: number, tout: number, x: number, y: number) {
  const pin = spr(t, tin, SP.text), pout = spr(t, tout, SP.text)
  const on = pin > 0.002 && pout < 0.998
  show(w, on)
  if (!on) return
  w.style.transform = `translate(${x}px,${y}px)`
  s.style.transform = `translateY(${((1 - pin) * 110 - pout * 110).toFixed(2)}%)`
}

// ─── now: the lock screen ──────────────────────────────────────────────────────

function sceneLock(k: Take, t: number) {
  const { E, L } = k
  const vis = t >= 32.4 && t < 61.3
  show(E.lockL, vis)
  if (!vis) return
  const R = lockRect(k, t), kk = Math.min(R.h / 900, R.w / 440), kr = kk / L.kFull
  boxTL(E.lock, R.x, R.y, R.w, R.h); E.lock.style.borderRadius = R.r + 'px'
  // long-press puts the lock screen in edit mode: it empties, so only the wallpaper lifts
  const edit = 1 - (spr(t, 46.15) - spr(t, 47.0, SP.pop))
  // the bezel grows out of the screen edge
  const bw = 0.036 * L.phone.w * spr(t, 38.45)
  show(E.bezel, bw > 0.3)
  if (bw > 0.3) { boxTL(E.bezel, R.x - bw, R.y - bw, R.w + 2 * bw, R.h + 2 * bw); E.bezel.style.borderRadius = R.r + bw + 'px' }
  const sb = spr(t, 38.8, SP.pop)
  E.sbtn.forEach((b, j) => {
    show(b, sb > 0.01)
    if (sb < 0.01) return
    const hgt = [0.07, 0.11, 0.15][j] * R.h, yy = R.y + [0.17, 0.27, 0.25][j] * R.h, xx = j < 2 ? R.x - bw - 3 : R.x + R.w + bw
    boxTL(b, xx, yy, 3 * sb, hgt)
  })
  // date and glass clock (Venice time)
  const clock = k.clock()
  if (!E.date.s.textContent) E.date.s.textContent = k.date()
  if (rise(E.date, t, 32.75, null)) {
    E.date.w.style.font = `600 ${21 * kk}px/1.2 var(--ui)`
    at(E.date.w, R.w / 2, 118 * kk, 0.5, 0.5); E.date.w.style.transform += ` scale(${edit})`
  }
  const gl = [...clock].map(ch => L.dg[ch] ?? L.dg['0'])
  const adv = gl.reduce((a, g) => a + g.adv, 0)
  let pen = -adv / 2
  E.digits.forEach((g, j) => {
    const G = gl[j]
    if (!G) { show(g.el, false); return }
    g.glyph(G)
    const p = spr(t, 33.0 + 0.15 * j, SP.pop) * edit
    show(g.el, p > 0.003)
    const X0 = R.w / 2 + (pen - G.pad) * kr, Y0 = 290 * kk - (G.pad + G.asc) * kr
    const gcx = R.w / 2 + (pen + G.adv / 2) * kr, gcy = 290 * kk - 0.36 * L.df * kr
    pen += G.adv
    if (p <= 0.003) return
    g.place(gcx - (gcx - X0) * p, gcy - (gcy - Y0) * p, kr * p); g.back(0, 0, 0, R.w, R.h)
  })
  // notifications from "now"
  E.cards.forEach((cd, j) => {
    const p = spr(t, 33.75 + 0.5 * j, SP.pop) * edit
    show(cd.gl.el, p > 0.003)
    if (p <= 0.003) return
    const S = kr * p, ccy = (420 + 92 * j) * kk
    cd.gl.place(R.w / 2 - (cd.gl.w * S) / 2, ccy - (cd.gl.h * S) / 2, S); cd.gl.back(0, 0, 0, R.w, R.h)
  })
  // home bar stretches into the music player
  const wd = track(t, 134, [[35.25, 360, SP.liq]]), hd = track(t, 5, [[35.25, 88, SP.liq]]), bd = track(t, 12, [[35.25, 30, SP.liq]])
  const pp = spr(t, 32.75, SP.pop) * edit
  show(E.player.el, pp > 0.003)
  if (pp <= 0.003) return
  const K = L.kFull
  E.player.size(wd * K, hd * K, Math.min(hd / 2, 28) * K); E.player.tint(lerp(0.92, 0.12, clamp((hd - 5) / 40)))
  const S = kr * pp, pcy = R.h - (bd + hd / 2) * kk
  E.player.place(R.w / 2 - (E.player.w * S) / 2, pcy - (E.player.h * S) / 2, S); E.player.back(0, 0, 0, R.w, R.h)
  const hasTrack = !!k.c.track
  const ca = hasTrack ? spr(t, 35.75, SP.pop) : 0, a = 58 * K, pad = 15 * K, ph = E.player.h
  show(E.pArt, ca > 0.01)
  if (ca > 0.01) { boxTL(E.pArt, pad, (ph - a) / 2, a, a); E.pArt.style.transform += ` scale(${ca})` }
  E.pT.w.style.font = `600 ${15 * K}px/1.2 var(--ui)`; E.pA.w.style.font = `400 ${13 * K}px/1.2 var(--ui)`
  if (rise(E.pT, hasTrack ? t : -1, 35.8, null)) at(E.pT.w, pad + a + 14 * K, ph / 2 - 11 * K, 0, 0.5)
  if (rise(E.pA, hasTrack ? t : -1, 35.9, null)) at(E.pA.w, pad + a + 14 * K, ph / 2 + 9 * K, 0, 0.5)
  E.pBtn.forEach((b, j) => {
    const s = hasTrack ? spr(t, 35.85 + 0.1 * j, SP.pop) : 0
    show(b, s > 0.01)
    if (s <= 0.01) return
    const bs = (j === 1 ? 26 : 20) * K
    b.style.width = b.style.height = bs + 'px'
    b.style.transform = `translate(${E.player.w - (110 - j * 36) * K - (bs * s) / 2}px,${ph / 2 - 6 * K - (bs * s) / 2}px) scale(${s})`
  })
  const pb = hasTrack ? spr(t, 36.0, SP.soft) : 0
  show(E.pBarA, pb > 0.01); show(E.pBarB, pb > 0.01)
  if (pb > 0.01) {
    const bw2 = E.player.w - pad * 2 - a - 14 * K, bx = pad + a + 14 * K, byy = ph - 16 * K
    boxTL(E.pBarA, bx, byy, bw2 * pb, 3 * K); boxTL(E.pBarB, bx, byy, bw2 * 0.38 * pb, 3 * K)
  }
}

// ─── stage: phone → island → window (experience, about) ───────────────────────────

function sceneStage(k: Take, t: number) {
  const { E, L } = k
  const { vh } = L
  const vis = t >= 38.7 && t < 61.3
  show(E.gooL, vis); show(E.winL, vis && t >= 40.9); show(E.titleL, vis && t >= 41.8)
  if (!vis) return
  const R = lockRect(k, t), W = L.win, wu = L.wu
  // Dynamic Island: stretches like liquid, pinches off, flies over and becomes the window's blind
  const iw = 0.3 * R.w, ih = 0.088 * R.w, il = R.x + R.w / 2 - iw / 2, icy = R.y + 0.042 * R.w + ih / 2
  const ip = spr(t, 38.75, SP.pop), iwS = iw * (1 + (spr(t, 39.25, SP.liq) - spr(t, 39.75, SP.liq)))
  show(E.island, ip > 0.01)
  if (ip > 0.01) { boxC(E.island, il + iwS / 2, icy, iwS, ih, ip); E.island.style.borderRadius = ih / 2 + 'px' }
  E.gooL.style.filter = t > 39.15 && t < 40.55 ? 'url(#goo)' : ''
  const fac = track(t, 0.78, [[39.25, 1.72, SP.liq], [39.75, 2.35]])
  const fp = spr(t, 40.25, SP.fly), fpc = clamp(fp)
  const bx = lerp(il + iw * fac, W.x + W.w / 2, fp), by = lerp(icy, W.y + W.h / 2, fp) - 0.18 * vh * Math.sin(Math.PI * fpc)
  const bd = track(t, 0, [[39.2, ih * 1.15, SP.pop], [40.25, ih * 1.6]])
  const q = spr(t, 40.9, SP.win), roll = spr(t, 41.4, SP.roll)
  const bw = lerp(bd, W.w, q), bh = lerp(bd, W.h, q), rTop = lerp(Math.min(bw, bh) / 2, 12 * wu, q)
  const top = by - bh / 2, hb = lerp(bh, L.th, roll)
  show(E.blind, bd > 1)
  if (bd > 1) {
    boxTL(E.blind, bx - bw / 2, top, bw, hb)
    E.blind.style.borderRadius = `${rTop}px ${rTop}px ${rTop * (1 - roll)}px ${rTop * (1 - roll)}px`
    E.roller.style.height = 7 * wu * Math.sin(Math.PI * clamp(roll)) + 'px'
  }
  if (t < 40.9) return
  boxTL(E.win, W.x, W.y, W.w, W.h)
  // the page exists only inside the blind's footprint, so it is never seen before the blind rolls
  const il2 = bx - bw / 2 - W.x, it2 = top - W.y
  E.win.style.clipPath = q > 0.999 ? '' : `inset(${Math.max(0, it2)}px ${Math.max(0, W.w - il2 - bw)}px ${Math.max(0, W.h - it2 - bh)}px ${Math.max(0, il2)}px round ${rTop}px)`
  // title bar
  E.lights.forEach((d, j) => { const s = spr(t, 41.9 + 0.08 * j, SP.pop), dd = 12 * wu; show(d, s > 0.01); if (s > 0.01) boxC(d, W.x + 22 * wu + j * 20 * wu, W.y + L.th / 2, dd, dd, s) })
  const push = spr(t, 48.0, { r: 0.5, d: 1 })
  const tpp = spr(t, 42.0, SP.pop)
  show(E.tabPill, tpp > 0.01)
  if (tpp > 0.01) boxC(E.tabPill, L.tab0 + L.tabW / 2 + push * (L.tabW + 8 * wu), W.y + L.th / 2, L.tabW, 28 * wu, tpp)
  if (rise(E.tabs[0], t, 42.05, null)) at(E.tabs[0].w, L.tab0 + L.tabW / 2, W.y + L.th / 2, 0.5, 0.5)
  if (rise(E.tabs[1], t, 42.12, null)) at(E.tabs[1].w, L.tabAbout.x, W.y + L.th / 2, 0.5, 0.5)
  const uw = Math.min(360 * wu, W.w * 0.42), ux = W.x + W.w - 18 * wu - uw, up = spr(t, 42.1, SP.snap)
  show(E.url, up > 0.01)
  if (up > 0.01) boxTL(E.url, ux, W.y + L.th / 2 - 13 * wu, uw * up, 26 * wu)
  if (rise(E.urlT[0], t, 42.25, 48.0)) at(E.urlT[0].w, ux + 12 * wu, W.y + L.th / 2, 0, 0.5)
  if (rise(E.urlT[1], t, 48.1, null)) at(E.urlT[1].w, ux + 12 * wu, W.y + L.th / 2, 0, 0.5)
  // page header
  const hy = L.th + L.hh / 2
  if (rise(E.hdrWm, t, 42.25, null)) at(E.hdrWm.w, L.col0, hy, 0, 0.5)
  E.nav.forEach((m, j) => {
    if (!rise(m, t, 42.3 + 0.05 * j, null)) return
    at(m.w, W.w * 0.36 + j * 96 * wu, hy, 0, 0.5)
    m.w.style.color = (j === 2 && push < 0.5) || (j === 3 && push >= 0.5) ? 'var(--ink)' : 'var(--muted)'
  })
  boxTL(E.hdrLine, 0, L.th + L.hh, W.w * spr(t, 42.3, SP.soft), 1)
  // pages push
  boxTL(E.pExp, -W.w * 0.3 * push, L.pageTop, W.w, L.pageH)
  show(E.pAbout, push > 0.001)
  if (push > 0.001) boxTL(E.pAbout, W.w * (1 - push), L.pageTop, W.w, L.pageH)
  // experience: bars draw across
  if (rise(E.expH, t, 42.5, null)) at(E.expH.w, L.col0, 22 * wu, 0, 0)
  if (rise(E.expS, t, 42.75, null)) at(E.expS.w, L.col0, 76 * wu, 0, 0)
  const span = Math.max(1, k.c.expTo - k.c.expFrom)
  const yx = (y: number) => L.barX0 + ((y - k.c.expFrom) / span) * (L.barX1 - L.barX0)
  E.years.forEach((m, j) => { if (rise(m, t, 42.8 + 0.03 * j, null)) at(m.w, yx(k.c.expFrom + j), L.rowY0 - 22 * wu, 0, 1) })
  boxTL(E.axis, L.barX0, L.rowY0 - 14 * wu, (L.barX1 - L.barX0) * spr(t, 42.8, SP.soft), 1)
  let nowY = -1, nowX = 0
  E.rows.forEach((r, j) => {
    const ry = L.rowY0 + j * L.rowDY + 4 * wu, row = k.c.exp[j]
    if (rise(r.a, t, 42.9 + 0.4 * j, null)) at(r.a.w, L.col0, ry, 0, 0)
    if (rise(r.b, t, 43.0 + 0.4 * j, null)) at(r.b.w, L.col0, ry + 18 * wu, 0, 0)
    const bp = spr(t, 43.0 + 0.4 * j, SP.snap), x0 = yx(row.s), x1 = yx(row.e), bh2 = 14 * wu
    show(r.bar, bp > 0.002)
    if (bp > 0.002) {
      r.bar.style.width = x1 - x0 + 'px'; r.bar.style.height = bh2 + 'px'; r.bar.style.borderRadius = bh2 / 2 + 'px'
      r.bar.style.transform = `translate(${x0}px,${ry + 8 * wu}px) scaleX(${bp})`
    }
    if (row.now) { nowY = ry + 8 * wu + 7 * wu; nowX = x1 }
  })
  const nd = nowY < 0 ? 0 : spr(t, 43.3 + 0.4 * E.rows.length, SP.pop)
  show(E.nowDot, nd > 0.01); show(E.nowRing, nd > 0.01)
  if (nd > 0.01) {
    const s = 10 * wu
    boxC(E.nowDot, nowX, nowY, s, s, nd)
    const ph = t % 1, rs = s * (1 + ph * 2.2)  // pulses on the beat
    boxC(E.nowRing, nowX, nowY, rs, rs); E.nowRing.style.borderWidth = Math.max(0, 2 * (1 - ph)) + 'px'
  }
  // about page, then the product card
  if (rise(E.abH, t, 49.0, 50.5)) at(E.abH.w, L.col0, L.heroH + 26 * wu, 0, 0)
  blockRise(E.abB, E.abBs, t, 49.35, 50.55, L.col0, L.heroH + 74 * wu)
  const py = L.prY - L.pageTop, pX = L.prX
  if (rise(E.prName, t, 51.0, null)) at(E.prName.w, pX, py, 0, 0)
  if (rise(E.prRole, t, 51.2, null)) at(E.prRole.w, pX, py + 42 * wu, 0, 0)
  const two = E.prStack.length > 1
  if (E.prStack[0] && rise(E.prStack[0], t, 51.4, two ? 52.8 : null)) at(E.prStack[0].w, pX, py + 96 * wu, 0, 0)
  if (two && rise(E.prStack[1], t, 52.9, null)) at(E.prStack[1].w, pX, py + 96 * wu, 0, 0)
  const swy = L.swY - L.pageTop, sel = two ? spr(t, 52.8) : 0
  E.sw.forEach((d, j) => { const s = spr(t, 51.5 + 0.1 * j, SP.pop); show(d, s > 0.01); if (s > 0.01) boxC(d, pX + L.swD / 2 + j * (L.swD + 14 * wu), swy + L.swD / 2, L.swD, L.swD, s) })
  const rp = E.sw.length ? spr(t, 51.9, SP.pop) : 0
  show(E.swRing, rp > 0.01)
  if (rp > 0.01) { const rd = L.swD + 8 * wu; boxC(E.swRing, pX + L.swD / 2 + sel * (L.swD + 14 * wu), swy + L.swD / 2, rd, rd, rp) }
  if (E.prSkills[0] && rise(E.prSkills[0], t, 51.8, two ? 52.85 : null)) at(E.prSkills[0].w, pX, swy + L.swD + 16 * wu, 0, 0)
  if (two && rise(E.prSkills[1], t, 52.95, null)) at(E.prSkills[1].w, pX, swy + L.swD + 16 * wu, 0, 0)
  const sgy = L.segY - L.pageTop
  if (rise(E.prEng, t, 52.0, null)) at(E.prEng.w, pX, sgy - 22 * wu, 0, 0)
  const sp = spr(t, 52.1, SP.pop)
  show(E.seg, sp > 0.01)
  if (sp > 0.01) {
    boxTL(E.seg, pX, sgy, L.segW, L.segH); E.seg.style.transform += ` scale(${sp})`
    const half = L.segW / 2, sx = spr(t, 53.5) * half
    boxTL(E.segPill, sx + 3 * wu, 3 * wu, half - 6 * wu, L.segH - 6 * wu)
    ;[E.segBase, E.segTopT].forEach(a => a.forEach((d, j) => { d.style.left = j * half + 'px'; d.style.width = half + 'px' }))
    E.segTop.style.clipPath = `inset(0 ${L.segW - sx - half + 3 * wu}px 0 ${sx + 3 * wu}px round 999px)`
  }
}

function sceneFrame(k: Take, t: number) {
  const { E, L } = k
  const { u } = L
  const vis = t >= 46.75 && t < 61.3
  show(E.frameL, vis)
  if (!vis) return
  const R = lockRect(k, t), W = L.win
  const cur = cursorAt(k, t) ?? { x: W.x + W.w * 0.5, y: W.y + L.pageTop + L.heroH * 0.5 }
  const q1 = spr(t, 46.75), q2 = spr(t, 48.5), q3 = spr(t, 50.5, SP.soft), sz = 1 + 0.12 * spr(t, 53.55)
  const cw = 200 * u, chh = 136 * u
  let r: Rect = lerpR({ x: R.x, y: R.y, w: R.w, h: R.h }, { x: cur.x - cw * 0.35, y: cur.y - chh * 0.42, w: cw, h: chh }, q1)
  r = lerpR(r, { x: W.x, y: W.y + L.pageTop, w: W.w, h: L.heroH }, q2)
  const iw = L.prIW * sz, ih = L.prIH * sz
  r = lerpR(r, { x: W.x + L.prCx - iw / 2, y: W.y + L.prCy - ih / 2, w: iw, h: ih }, q3)
  const rad = lerp(lerp(R.r, 14 * u, q1), 0, q2)
  const m = L.mat * sz * spr(t, 50.9), g = L.mold * sz * spr(t, 51.1), o = m + g
  boxTL(E.frame, r.x - o, r.y - o, r.w + 2 * o, r.h + 2 * o)
  boxTL(E.fMold, 0, 0, r.w + 2 * o, r.h + 2 * o); boxTL(E.fPaint, 0, 0, r.w + 2 * o, r.h + 2 * o)
  boxTL(E.fMat, g, g, r.w + 2 * m, r.h + 2 * m); boxTL(E.fImg, o, o, r.w, r.h)
  E.fImg.style.borderRadius = rad + 'px'; E.fMat.style.borderRadius = rad + 'px'
  const st = k.c.stacks
  E.fMold.style.background = st[0]?.c ?? '#0B0B0C'; E.fPaint.style.background = st[1]?.c ?? st[0]?.c ?? '#0B0B0C'
  E.fPaint.style.clipPath = `inset(0 ${(1 - spr(t, 52.8, { r: 0.5, d: 1 })) * 100}% 0 0)`
  E.frame.style.boxShadow = `0 ${lerp(30, 14, q2)}px ${lerp(60, 30, q2)}px rgba(20,14,6,${(0.3 * clamp(q1) - 0.12 * clamp(q2)).toFixed(3)})`
}

// ─── order: one black shape ────────────────────────────────────────────────────

function sceneCta(k: Take, t: number) {
  const { E, L } = k
  const { u, cx, cy } = L
  const vis = t >= 42.4 && t < 62.3
  show(E.ctaL, vis)
  if (!vis) return
  const N = L.navSlot, C = L.ctaSlot, H = 1.35 * L.hyp, flyS = { r: 0.55, d: 0.8 }
  const fly = spr(t, 54.0, flyS)
  const x = track(t, N.cx, [[54.0, C.cx, flyS], [55.25, cx]])
  const y = track(t, N.cy, [[54.0, C.cy, flyS], [55.25, cy]]) + 60 * u * Math.sin(Math.PI * clamp(fly)) * (1 - spr(t, 55.25))
  const w = track(t, N.w, [[54.0, C.w, flyS], [55.25, 400 * u], [56.5, 540 * u], [58.0, 820 * u], [59.5, 190 * u], [60.75, H, SP.fast]])
  const h = track(t, N.h, [[54.0, C.h, flyS], [55.25, 124 * u], [59.5, 190 * u], [60.75, H, SP.fast]])
  const sc = spr(t, 42.4, SP.pop) * (1 - 0.06 * (spr(t, 55.0, SP.fast) - spr(t, 55.18)))
  boxC(E.cta, x, y, w, h, sc); E.cta.style.borderRadius = Math.min(w, h) / 2 + 'px'
  const Lb = E.ctaLb, mid = h / 2, cxl = w / 2
  const put = (m: MLine, tin: number, tout: number, px: number, py: number, ax = 0.5) => {
    if (!rise(m, t, tin, tout)) return
    m.w.style.left = px + 'px'; m.w.style.top = py + 'px'; m.w.style.transform = `translate(${-ax * 100}%,-50%)`
  }
  put(Lb.contact, 42.5, 54.25, cxl, mid); put(Lb.touch, 54.4, 55.25, cxl, mid)
  put(Lb.sent, 55.5, 56.5, cxl + 22 * u, mid); put(Lb.read, 56.75, 58.0, cxl - 50 * u, mid - 8 * u)
  const pr = seg(t, 56.9, 57.7)
  Lb.pct.s.textContent = Math.round(eio(pr) * 100) + '%'
  put(Lb.pct, 56.85, 58.0, cxl + 110 * u, mid - 8 * u)
  put(Lb.way, 58.25, 59.5, cxl, mid - 22 * u); put(Lb.from, 58.35, 59.5, 60 * u, mid + 26 * u, 0); put(Lb.to, 58.4, 59.5, w - 60 * u, mid + 26 * u, 1)
  put(Lb.done, 59.9, 60.6, cxl, mid + 42 * u)
  const c1 = spr(t, 55.55, SP.pop) * (1 - spr(t, 56.5)), c1s = 36 * u
  show(E.ck1, c1 > 0.01)
  if (c1 > 0.01) { boxC(E.ck1, cxl - 70 * u, mid, c1s, c1s, c1); (E.ck1.querySelector('.ck') as SVGPathElement).style.strokeDashoffset = String(1 - clamp(spr(t, 55.65, SP.soft))) }
  const c2 = spr(t, 59.7, SP.pop) * (1 - spr(t, 60.6)), c2s = 64 * u
  show(E.ck2, c2 > 0.01)
  if (c2 > 0.01) { boxC(E.ck2, cxl, mid - 16 * u, c2s, c2s, c2); (E.ck2.querySelector('.ck') as SVGPathElement).style.strokeDashoffset = String(1 - clamp(spr(t, 59.85, SP.soft))) }
  const rb = spr(t, 56.85) * (1 - spr(t, 58.0))
  show(E.rdBarA, rb > 0.01); show(E.rdBarB, rb > 0.01)
  if (rb > 0.01) { const bw = 300 * u; boxTL(E.rdBarA, cxl - bw / 2, mid + 28 * u, bw * rb, 3 * u); boxTL(E.rdBarB, cxl - bw / 2, mid + 28 * u, bw * eio(pr) * rb, 3 * u) }
  const rt = spr(t, 58.35) * (1 - spr(t, 59.5))
  show(E.route, rt > 0.01); show(E.plane, rt > 0.01)
  if (rt > 0.01) {
    const x0 = 140 * u, x1 = w - 120 * u
    boxTL(E.route, x0, mid + 26 * u, (x1 - x0) * rt, 2)
    const pp = eio(seg(t, 58.5, 59.35)), ps = 24 * u
    boxC(E.plane, lerp(x0, x1, pp), mid + 26 * u, ps, ps, rt)
  }
}

// ─── wall ──────────────────────────────────────────────────────────────────────

function sceneWall(k: Take, t: number) {
  const { E, L } = k
  const vis = t >= 61.2 && t < 68.6
  show(E.wall, vis)
  if (!vis) return
  const P = L.print, m = L.wm2, g = L.wg
  // the flood contracts into the frame: its inside opens while its edge closes in
  const p = spr(t, 62.25, SP.soft), hw = (P.w + 2 * m) * p, hh = (P.h + 2 * m) * p
  boxC(E.wmold, L.fc.x, L.fc.y, hw, hh)
  E.wmold.style.boxShadow = `0 0 0 ${lerp(L.hyp * 1.2, g, p)}px #0B0B0C`
  boxC(E.wmat, L.fc.x, L.fc.y, P.w + 2 * m, P.h + 2 * m)
  boxC(E.wshadow, L.fc.x, L.fc.y, P.w + 2 * (m + g), P.h + 2 * (m + g))
  boxTL(E.wprint, P.x, P.y, P.w, P.h)
  setIris(E.wiris, P.w, P.h, track(t, 1, [[66.5, 0, SP.close], [67.0, 1, { r: 0.45, d: 0.6 }], [67.5, 0, SP.close]]))
  const pp = spr(t, 62.7, SP.pop)
  show(E.placard, pp > 0.01)
  if (pp > 0.01) E.placard.style.transform = `translate(${L.plc.x}px,${L.plc.y}px) scale(${pp})`
  E.pl.forEach((l, j) => { const q = spr(t, 62.9 + 0.15 * j, SP.text); l.s.style.transform = `translateY(${(1 - q) * 110}%)` })
  // footage: the plant shadows move in real time
  const s = performance.now() / 1000
  E.leafG.forEach((b, j) => {
    const a = Math.sin(s * (0.55 + j * 0.13) + j * 1.7) * 2.2 + Math.sin(s * 1.7 + j) * 0.6
    b.setAttribute('transform', `rotate(${a.toFixed(2)} ${b.dataset.x} ${b.dataset.y})`)
  })
}

// ─── cursor ────────────────────────────────────────────────────────────────────

const press = (t: number, tc: number) => spr(t, tc, SP.fast) - spr(t, tc + 0.18)

interface CursorState { x: number; y: number; s: number; p: number; k?: number; clk?: number[]; lp?: number }

export function cursorAt(k: Take, t: number): CursorState | null {
  const { L } = k
  const { vw, vh, u, cx, cy } = L
  const W = L.win
  if (t >= 5.75 && t < 7.6) {
    return { x: track(t, cx + 300 * u, [[5.85, cx + 60 * u, SP.move]]), y: track(t, cy + 240 * u, [[5.85, cy + 18 * u, SP.move]]),
      s: spr(t, 5.75, SP.pop) * (1 - spr(t, 7.3)), p: press(t, 6.75), clk: [6.75] }
  }
  if (t >= 16.5 && t < 18.7) {
    const B = bento0(k), c = camAt(k, t)
    const wx = track(t, cx + 0.32 * vw, [[16.6, B.x + B.w * 0.56, SP.move]]), wy = track(t, cy + 0.3 * vh, [[16.6, B.y + B.h * 0.6, SP.move]])
    return { x: c.tx + wx * c.k, y: c.ty + wy * c.k, s: spr(t, 16.5, SP.pop) * (1 - spr(t, 18.25)), k: c.k, p: press(t, 17.75), clk: [17.75] }
  }
  if (t >= 24.9 && t < 31.1) {
    let x = track(t, cx + 0.28 * vw, [[25.0, L.adjX, SP.move], [25.85, L.trackL, SP.move]]), y = track(t, vh - 30 * u, [[25.0, L.tbY, SP.move]])
    const b = smooth(seg(t, 26.2, 26.6))
    x = lerp(x, knobX(k, t), b); y = lerp(y, L.tbY, b)
    return { x: x + 4 * u, y: y + 6 * u, s: spr(t, 24.9, SP.pop) * (1 - spr(t, 30.85)), p: press(t, 25.5) + (spr(t, 26.45, SP.fast) - spr(t, 30.5)), clk: [25.5] }
  }
  if (t >= 45.5 && t < 48.95) {
    const P = L.phone
    const x = track(t, vw * 0.55, [[45.6, P.x + P.w * 0.5, SP.move], [46.8, L.tabAbout.x, { r: 0.7, d: 1 }], [48.05, W.x + W.w * 0.5, SP.move]])
    const y = track(t, vh * 0.92, [[45.6, P.y + P.h * 0.64, SP.move], [46.8, L.tabAbout.y, { r: 0.7, d: 1 }], [48.05, W.y + L.pageTop + L.heroH * 0.5, SP.move]])
    return { x, y, s: spr(t, 45.5, SP.pop) * (1 - spr(t, 48.7)), p: spr(t, 46.0, SP.fast) - spr(t, 48.5), lp: t < 46.9 ? seg(t, 46.0, 46.75) * (1 - spr(t, 46.75)) : 0 }
  }
  if (t >= 51.8 && t < 55.45) {
    const pX = W.x + L.prX, swy = W.y + L.swY + L.swD / 2
    const x = track(t, W.x + W.w * 0.92, [[51.9, pX + L.swD / 2 + L.swD + 14 * L.wu, SP.move], [53.0, pX + L.segW * 0.75, SP.move], [54.3, L.ctaSlot.cx + 30 * u, SP.move]])
    const y = track(t, W.y + W.h * 0.96, [[51.9, swy, SP.move], [53.0, W.y + L.segY + L.segH / 2, SP.move], [54.3, L.ctaSlot.cy + 6 * u, SP.move]])
    return { x, y, s: spr(t, 51.8, SP.pop) * (1 - spr(t, 55.3)), p: press(t, 52.75) + press(t, 53.5) + press(t, 55.0), clk: [52.75, 53.5, 55.0] }
  }
  return null
}

function sceneCursor(k: Take, t: number) {
  const { E, L } = k
  const c = cursorAt(k, t)
  const on = !!c && c.s > 0.01
  show(E.cursor, on); show(E.ring, false); show(E.lp, false)
  if (!c || !on) return
  const kk = (c.k ?? 1) * L.cur, s = c.s * kk * (1 - 0.16 * c.p)
  E.cursor.style.transform = `translate(${c.x - 5}px,${c.y - 3}px) scale(${s})`
  for (const tc of c.clk ?? []) {
    if (t < tc || t >= tc + 0.7) continue
    const q = seg(t, tc, tc + 0.7), rr = (8 + 30 * eio(q)) * kk
    show(E.ring, true); boxC(E.ring, c.x, c.y, rr * 2, rr * 2); E.ring.style.borderWidth = Math.max(0, 2.5 * (1 - q)) * kk + 'px'
  }
  if (c.lp && c.lp > 0.001) { const d = 46 * kk; show(E.lp, true); boxC(E.lp, c.x, c.y, d, d); E.lpC.style.strokeDashoffset = String(1 - c.lp) }
}

// ─── chrome ────────────────────────────────────────────────────────────────────

const DARK: readonly [number, number][] = [[18.7, 38.35], [60.95, 62.45], [68.45, 68.8]]

function sceneChrome(k: Take, t: number) {
  const { E } = k
  E.chrome.classList.toggle('dark', DARK.some(([a, b]) => t >= a && t < b))
  E.ph.style.left = `calc(${((t / T_END) * 100).toFixed(3)}% - 1px)`
  const secs = t * 0.5
  E.tc.textContent = `beat ${t.toFixed(1).padStart(4, '0')} / ${T_END} · ${String(Math.floor(secs / 60)).padStart(2, '0')}:${(secs % 60).toFixed(1).padStart(4, '0')}`
  let on = 0
  CHAPTERS.forEach((ch, i) => { if (t >= ch.beat - 0.5) on = i })
  if (on !== k.chapter) {
    k.chapter = on
    E.chap.forEach((b, i) => { b.classList.toggle('on', i === on); if (i === on) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current') })
    k.opts.onChapter?.(CHAPTERS[on].id)
  }
}

export function seek(k: Take, t: number) {
  sceneWipe(k, t); sceneWorld(k, t); sceneCase(k, t); sceneLock(k, t); sceneStage(k, t)
  sceneFrame(k, t); sceneCta(k, t); sceneWall(k, t); sceneCursor(k, t); sceneChrome(k, t)
}
