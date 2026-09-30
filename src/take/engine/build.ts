/**
 * build.ts — creates the film's DOM once, from the content. Nothing here moves: seek(t)
 * places everything each frame.
 *
 * Accessibility: the moving layers are decorative (the page carries the same content in a
 * visually hidden document, see TakeDocument.tsx) and are aria-hidden. What stays reachable
 * is interactive: the chrome (with the link to the prototype gallery), the project tiles
 * while the bento rests, the "all projects" button, the case link and the contact card.
 */

import { mk, mline, type MLine } from './dom'
import { Glass } from './glass'
import { GlassWordGL } from './glassWordGL'
import { ICO } from './icons'
import { makeIris, type Iris } from './iris'
import { NavLens } from './navGlass'
import type { Take } from './Take'
import { CHAPTERS, T_END } from './timeline'

export interface Tile {
  el: HTMLDivElement
  poster: SVGSVGElement
  cap: HTMLDivElement
  num: MLine
  title: MLine
  sub: MLine
  l1?: MLine
  l2?: MLine
  iris?: Iris
}

const hide = <T extends Element>(e: T): T => { e.setAttribute('aria-hidden', 'true'); return e }

function leavesSVG(): string {
  const branch = (x0: number, y0: number, len: number, ang: number, n: number, side: number) => {
    const pts: [number, number][] = []
    for (let i = 0; i <= n; i++) { const p = i / n, a = ang + Math.sin(p * 2.2) * 0.35 * side; pts.push([x0 + Math.cos(a) * len * p, y0 + Math.sin(a) * len * p]) }
    const d = 'M' + pts.map(p => p.map(v => v.toFixed(1)).join(' ')).join('L')
    let lv = ''
    pts.forEach(([x, y], i) => {
      if (i === 0) return
      const a = (ang * 180) / Math.PI + (i % 2 ? 48 : -48) + i * 3 * side, s = 1 - i / (n * 1.6)
      lv += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(46 * s).toFixed(1)}" ry="${(15 * s).toFixed(1)}" transform="rotate(${a.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}) translate(${(34 * s).toFixed(1)} 0)"/>`
    })
    return `<g class="br" data-x="${x0}" data-y="${y0}"><path d="${d}" fill="none" stroke="#3f3122" stroke-width="5"/>${lv}</g>`
  }
  return `<svg id="leaves" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
    <defs><filter id="tk-lb" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8"/></filter></defs>
    <g filter="url(#tk-lb)" fill="#3f3122" fill-opacity=".3" stroke-opacity=".3">
      ${branch(1060, -40, 620, 2.25, 11, 1)}${branch(1060, 180, 520, 2.72, 9, -1)}${branch(880, -60, 380, 1.95, 7, 1)}
    </g></svg>`
}

export function buildEls(k: Take) {
  const c = k.c, root = k.root
  const scroller = mk('div', null, root); scroller.id = 'scroller'
  const stage = mk('div', null, root); stage.id = 'stage'
  const layer = (id: string, decorative = false) => { const l = mk('div', 'layer', stage); l.id = id; if (decorative) hide(l); return l }
  const wall = layer('wall')
  const world = layer('world'); world.classList.add('abs')
  const caseL = layer('caseL'), lockL = layer('lockL', true), winL = layer('winL', true), gooL = layer('gooL', true)
  const titleL = layer('titleL', true), frameL = layer('frameL', true), ctaL = layer('ctaL', true), curL = layer('curL', true)
  const wipeRect = document.getElementById('wipeRect'), wipeLine = document.getElementById('wipeLine')

  // wordmark: the name, then a dot that is also tile 0
  const wm = hide(mk('div', null, world)); wm.id = 'wm'
  const letters = [...c.wordmark].map(ch => mk('span', 'wl', wm, ch))

  const featured = c.projects.slice(0, 9)
  const tiles: Tile[] = featured.map((p, i) => {
    const el = mk('div', 'tile abs', world)
    el.setAttribute('role', 'button'); el.setAttribute('aria-label', i === 0 ? `Play the ${p.title} case study` : `Open ${p.title}`); el.tabIndex = -1
    el.insertAdjacentHTML('beforeend', `<svg class="poster" aria-hidden="true"><use href="#${p.sym}" width="100%" height="100%"/></svg>`)
    const poster = el.lastElementChild as SVGSVGElement
    const cap = hide(mk('div', 'cap', el))
    if (p.light) cap.style.color = '#141414'
    cap.style.background = `linear-gradient(to top, ${p.bg} 0%, ${p.bg}E6 45%, ${p.bg}00 100%)`
    const t: Tile = { el, poster, cap, num: mline(cap, `${p.n} · ${p.year}`, 'n'), title: mline(cap, p.title, 't'), sub: mline(cap, p.sub, 's') }
    if (i === 0) { t.l1 = mline(el, c.role, 'pl'); t.l2 = mline(el, c.tagline, 'pl'); hide(t.l1.w); hide(t.l2.w); t.iris = makeIris(el); hide(t.iris.s) }
    return t
  })
  tiles.slice(1).reverse().forEach(o => world.insertBefore(o.el, tiles[0].el))
  const workHead = mline(world, `Selected work · open any tile`, 'k-mono'); hide(workHead.w)
  const workCount = mline(world, `<button type="button" class="allbtn">All ${c.projects.length} projects →</button>`, 'k-mono', true)
  const allBtn = workCount.s.firstElementChild as HTMLButtonElement
  allBtn.tabIndex = -1

  // case study (screen space)
  const lead = c.projects[0]
  // the glass word: one WebGL canvas when available, SVG glass letters otherwise
  const wordGL = GlassWordGL.create(caseL)
  const gw = hide(mk('div', 'layer', caseL))
  const word = [...(lead?.title ?? '')].filter(ch => ch !== ' ').map(() => new Glass(gw, { glyph: true, back: [lead.sym], tint: 0.16, sat: 1.35 }))
  const tb = new Glass(gw, { back: [lead?.sym ?? 'p-generic'], bevel: 26, scale: 34, tint: 0.1 })
  const tbLabel = mline(tb.gc, lead?.title ?? '', 'cw tb-label')
  const tbIcons = (['info', 'layers', 'adjust', 'ext'] as const).map(n => mk('div', 'a', tb.gc, ICO[n]))
  const trackA = mk('div', 'a track-a', tb.gc), trackB = mk('div', 'a track-b', tb.gc)
  const knob = mk('div', 'a knob', tb.gc)
  const slRaw = mline(tb.gc, 'raw', 'k-mono cw'), slTri = mline(tb.gc, 'triaged', 'k-mono cw')
  const orb = new Glass(caseL, { circle: true, lens: 0.22, back: [lead?.sym ?? 'p-generic'], inner: 'wallpaper', tint: 0.05 })
  hide(orb.el)
  const csub = mline(caseL, lead?.sub ?? '', 'cw csub'), cmeta = mline(caseL, `${lead?.n ?? ''} · ${lead?.year ?? ''} · ${lead?.role ?? ''}`, 'k-mono cw')
  hide(csub.w); hide(cmeta.w)
  const [cap1, cap2] = splitHalf(lead?.caption ?? '')
  const info = [
    mline(caseL, `${lead?.n ?? ''} — ${lead?.title ?? ''} · ${lead?.year ?? ''}`, 'k-mono cw'),
    mline(caseL, cap1, 'cw info-h'), mline(caseL, cap2, 'cw info-h'),
  ]
  info.forEach(m => hide(m.w))
  const leadP = mk('div', 'mf cw info-p', caseL); hide(leadP)
  const leadS = mk('span', null, leadP, ''); leadS.textContent = c.lead
  const tagsL = mline(caseL, (lead?.tags ?? []).slice(0, 5).join(' · '), 'k-mono cw'); hide(tagsL.w)
  const caseLink = mline(caseL, `<a class="caselink" href="/project/${esc(lead?.slug ?? '')}">Read the full case study →</a>`, 'k-mono cw', true)
  const caseA = caseLink.s.firstElementChild as HTMLAnchorElement
  const res = (lead?.results ?? []).map(r => { const a = mline(caseL, r.value, 'cw res-a'), b = mline(caseL, r.label, 'cw res-b'); hide(a.w); hide(b.w); return { a, b } })

  // lock screen / phone
  const bezel = mk('div', 'abs', lockL); bezel.id = 'bezel'
  const sbtn = [0, 1, 2].map(() => mk('div', 'sbtn abs', lockL))
  const lock = mk('div', 'abs', lockL); lock.id = 'lock'
  mk('div', null, lock, '<svg class="wp"><use href="#wallpaper" width="100%" height="100%"/></svg>')
  const date = mline(lock, '', 'cw')
  const digits = [0, 1, 2, 3, 4].map(() => new Glass(lock, { glyph: true, back: ['wallpaper'], tint: 0.3, sat: 1.4 }))
  const cards = c.now.map(n => {
    const gl = new Glass(lock, { back: ['wallpaper'], bevel: 18, scale: 28, tint: 0.12 })
    const ic = mk('div', 'a', gl.gc, `<div class="now-ic" style="background:${n.c}">${esc(n.i)}</div>`)
    const kk = mk('div', 'card-t k-mono', gl.gc, ''); kk.textContent = n.k
    const v = mk('div', 'card-t', gl.gc, ''); v.textContent = n.v
    const tm = mk('div', 'card-t k-mono', gl.gc, 'now')
    return { gl, ic, k: kk, v, tm }
  })
  const player = new Glass(lock, { back: ['wallpaper'], bevel: 16, scale: 26, tint: 0.12 })
  const pArt = mk('div', 'a', player.gc, '<div class="p-art"></div>')
  const pT = mline(player.gc, c.track?.title ?? '', 'cw'), pA = mline(player.gc, c.track?.artist ?? '', 'cw')
  const pBtn = (['prev', 'play', 'next'] as const).map(n => mk('div', 'a', player.gc, ICO[n]))
  const pBarA = mk('div', 'a p-bar-a', player.gc), pBarB = mk('div', 'a p-bar-b', player.gc)

  // mac window
  const win = mk('div', 'abs', winL); win.id = 'win'
  const hdrWm = mline(win, `${c.wordmark}.`, 'wm-small')
  const nav = ['Work', 'Now', 'Experience', 'About'].map(n => mline(win, n, 'win-nav'))
  const hdrLine = mk('div', 'a rule', win)
  const pExp = mk('div', 'a', win), pAbout = mk('div', 'a p-about', win)
  const expH = mline(pExp, 'Experience.', 'wm-h')
  const expS = mline(pExp, c.expIntro, 'muted')
  const yearsN = Math.max(1, Math.ceil(c.expTo) - c.expFrom)
  const years = Array.from({ length: yearsN + 1 }, (_, j) => mline(pExp, String(c.expFrom + j), 'k-mono'))
  const axis = mk('div', 'a rule', pExp)
  const rows = c.exp.map(r => {
    const a = mline(pExp, r.a, 'row-a'), b = mline(pExp, r.b, 'k-mono muted')
    const bar = mk('div', 'bar', pExp); bar.style.background = r.edu ? '#CFC6B6' : 'var(--ink)'
    return { a, b, bar }
  })
  const nowDot = mk('div', 'a now-dot', pExp), nowRing = mk('div', 'a now-ring', pExp)
  const abH = mline(pAbout, c.aboutHeading, 'wm-h plain')
  const abB = mk('div', 'mf ab-b', pAbout); const abBs = mk('span', null, abB, ''); abBs.textContent = c.aboutBody
  const prName = mline(pAbout, c.fullName, 'wm-h')
  const prRole = mline(pAbout, `${c.role} · ${c.location}, Italy`, 'muted')
  const prStack = c.stacks.slice(0, 2).map(s => mline(pAbout, `Stack — ${s.n}`, 'k-mono'))
  const sw = c.stacks.map(s => { const d = mk('div', 'sw', pAbout); d.style.background = s.c; return d })
  const swRing = mk('div', 'sw sw-ring', pAbout)
  const prSkills = c.stacks.slice(0, 2).map(s => mline(pAbout, s.s, 'skills'))
  const prEng = mline(pAbout, 'Engagement', 'k-mono')
  const seg = mk('div', 'a', pAbout); seg.id = 'seg'
  const segPill = mk('div', 'a seg-pill', seg)
  const segBase = [mk('div', 'segt', seg, 'Freelance'), mk('div', 'segt', seg, 'Full-time')]
  const segTop = mk('div', 'a seg-top', seg)
  const segTopT = [mk('div', 'segt', segTop, 'Freelance'), mk('div', 'segt', segTop, 'Full-time')]

  // island + blob, merged by the goo filter while they touch
  const island = mk('div', 'abs island', gooL)
  const blind = mk('div', 'abs', gooL); blind.id = 'blind'
  const roller = mk('div', null, blind); roller.id = 'roller'

  // title bar
  const lights = ['#FF5F57', '#FEBC2E', '#28C840'].map(col => { const d = mk('div', 'tl-dot abs', titleL); d.style.background = col; return d })
  const tabPill = mk('div', 'abs tab-pill', titleL)
  const tabs = ['experience', 'about'].map(n => mline(titleL, n, 'tab'))
  const url = mk('div', 'abs url', titleL)
  const host = location.host || 'daniel.busetto.techdani.cc'
  const urlT = [`${host}/experience`, `${host}/about`].map(s => mline(titleL, s, 'k-mono url-t'))

  // framed print: the dragged wallpaper
  const frame = mk('div', 'abs', frameL); frame.id = 'frame'
  const fMold = mk('div', 'mold', frame), fPaint = mk('div', 'paint', frame)
  const fMat = mk('div', 'mat', frame)
  const fImg = mk('div', 'img', frame, '<svg><use href="#wallpaper" width="100%" height="100%"/></svg>')

  // the one black shape: nav button → CTA → order states → flood
  const cta = mk('div', 'abs', ctaL); cta.id = 'cta'
  const ctaL2 = {
    contact: mline(cta, 'Contact', 'pl'), touch: mline(cta, 'Get in touch →', 'pl'),
    sent: mline(cta, 'Sent', 'pl'), read: mline(cta, 'Reading', 'pl'), pct: mline(cta, '0%', 'pl k-mono'),
    way: mline(cta, 'Reply on its way', 'pl'), from: mline(cta, c.location, 'pl k-mono'), to: mline(cta, 'you', 'pl k-mono'),
    done: mline(cta, 'Delivered', 'pl'),
  }
  const ck1 = mk('div', 'abs ck', cta, ICO.check), ck2 = mk('div', 'abs ck', cta, ICO.check)
  const rdBarA = mk('div', 'abs rd-a', cta), rdBarB = mk('div', 'abs rd-b', cta)
  const route = mk('div', 'abs route', cta)
  const plane = mk('div', 'abs', cta, ICO.plane)

  // wall
  hide(mk('div', null, wall)).id = 'wlight'
  const wshadow = hide(mk('div', 'abs', wall)); wshadow.id = 'wshadow'
  const wmat = hide(mk('div', 'abs', wall)); wmat.id = 'wmat'
  const wprint = hide(mk('div', 'abs', wall, '<svg><use href="#wallpaper" width="100%" height="100%"/></svg>')); wprint.id = 'wprint'
  const wiris = makeIris(wprint)
  const wmold = hide(mk('div', 'abs', wall)); wmold.id = 'wmold'
  const placard = mk('div', 'abs', wall); placard.id = 'placard'
  placard.setAttribute('aria-label', 'Contact')
  const plRows: [string, string][] = [
    [`<b>${esc(c.fullName)}</b>`, 'p1'],
    [`${esc(c.wordmark)}., ${c.year}`, 'p2 muted'],
    [esc(c.placardLine), 'p2 wrap gap'],
    [esc([`${c.location}, Italy`, c.availability].filter(Boolean).join(' · ')), 'p2 wrap'],
    [`<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`, 'p2 strong gap'],
    ...(c.github ? [[`<a href="${esc(c.github)}" target="_blank" rel="noopener noreferrer">${esc(c.github.replace(/^https?:\/\//, ''))} ↗</a>`, 'p2 strong']] as [string, string][] : []),
    ['<button type="button" class="pl-btn">Write to me</button>', 'p2 gap'],
  ]
  const pl = plRows.map(([h, cls]) => { const d = mk('div', 'mf ' + cls, placard); const s = mk('span', null, d, h); return { w: d, s } })
  const plBtn = placard.querySelector('.pl-btn') as HTMLButtonElement
  const leaves = hide(mk('div', null, wall, leavesSVG()).firstElementChild as SVGSVGElement)
  const leafG = [...leaves.querySelectorAll<SVGGElement>('.br')]

  // cursor
  const ring = mk('div', 'abs', curL); ring.id = 'ring'
  const lp = mk('div', 'abs', curL, '<svg viewBox="0 0 40 40" width="100%" height="100%"><circle cx="20" cy="20" r="17" fill="none" stroke="#fff" stroke-width="3" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" transform="rotate(-90 20 20)"/></svg>')
  const lpC = lp.querySelector('circle') as SVGCircleElement
  const cursor = mk('div', 'abs', curL, ICO.cursor); cursor.id = 'cursor'

  // the shutter a far chapter jump closes over the film, below the chrome
  const cutL = mk('div', 'abs', stage); cutL.id = 'tk-cut'
  const cutIris = makeIris(cutL); hide(cutIris.s); cutIris.s.style.display = 'none'

  // chrome
  const chrome = mk('div', null, stage); chrome.id = 'chrome'
  chrome.innerHTML = `
    <div id="tk-top">
      <a class="brand" href="/" aria-label="${esc(c.fullName)}, back to the start"><b class="b-full">${esc(c.fullName)}</b><b class="b-logo" aria-hidden="true">${esc(c.logo)}</b> <span>· ${esc(c.role.toLowerCase())}, ${esc(c.location)}</span></a>
      <nav id="tk-chap" aria-label="Chapters"><span class="lens" aria-hidden="true"></span></nav>
      <div class="top-r">
        ${c.prototypes ? '<a id="tk-protos" href="/prototypes">Prototypes</a>' : ''}
        <button id="tk-projects" type="button">Projects</button>
        <button id="tk-play" type="button" aria-pressed="false"><svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 0.5v9l8-4.5z"/></svg><span>Play the take</span></button>
      </div>
    </div>
    <div id="tk-bot">
      <div id="tk-tl" aria-hidden="true"><div id="tk-ph"></div></div>
      <div id="tk-meta" aria-hidden="true"><span>One take · ${T_END} beats · 120 bpm</span><span id="tk-tc">beat 00.0</span><span class="hint">scroll · arrows jump · space plays</span></div>
    </div>`
  const chapNav = chrome.querySelector('#tk-chap') as HTMLElement
  const chap = CHAPTERS.map(ch => { const b = mk('button', null, chapNav); b.type = 'button'; b.textContent = ch.label; return b })
  const navLens = new NavLens(chapNav, chapNav.querySelector('.lens') as HTMLElement, chap)
  const tl = chrome.querySelector('#tk-tl') as HTMLDivElement
  for (let b = 0; b <= Math.floor(T_END); b++) {
    const tk = mk('div', 'tick' + (CHAPTERS.some(ch => Math.abs(ch.beat - b) < 0.5) ? ' ch' : ''), tl)
    tk.style.left = (b / T_END) * 100 + '%'
  }

  return {
    scroller, stage, wall, world, caseL, lockL, winL, gooL, titleL, frameL, ctaL, curL, wipeRect, wipeLine,
    wm, letters, tiles, workHead, workCount, allBtn,
    gw, word, wordGL, tb, tbLabel, tbIcons, trackA, trackB, knob, slRaw, slTri, orb, csub, cmeta, info, leadP, leadS, tagsL, caseLink, caseA, res,
    bezel, sbtn, lock, date, digits, cards, player, pArt, pT, pA, pBtn, pBarA, pBarB,
    win, hdrWm, nav, hdrLine, pExp, pAbout, expH, expS, years, axis, rows, nowDot, nowRing, abH, abB, abBs,
    prName, prRole, prStack, sw, swRing, prSkills, prEng, seg, segPill, segBase, segTop, segTopT,
    island, blind, roller, lights, tabPill, tabs, url, urlT,
    frame, fMold, fPaint, fMat, fImg,
    cta, ctaLb: ctaL2, ck1, ck2, rdBarA, rdBarB, route, plane,
    wshadow, wmat, wprint, wiris, wmold, placard, pl, plBtn, leaves, leafG,
    ring, lp, lpC, cursor, cutIris,
    chrome, chap, navLens, tl, ph: chrome.querySelector('#tk-ph') as HTMLDivElement, tc: chrome.querySelector('#tk-tc') as HTMLSpanElement,
    play: chrome.querySelector('#tk-play') as HTMLButtonElement, projectsBtn: chrome.querySelector('#tk-projects') as HTMLButtonElement,
    protosLink: chrome.querySelector<HTMLAnchorElement>('#tk-protos'),
  }
}

export type Els = ReturnType<typeof buildEls>

function esc(s: string): string {
  return s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string))
}

/** A caption in two lines, broken at the space nearest its middle. */
function splitHalf(s: string): [string, string] {
  const mid = s.length / 2
  let best = -1
  for (let i = 0; i < s.length; i++) if (s[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i
  return best < 0 ? [s, ''] : [s.slice(0, best), s.slice(best + 1)]
}
