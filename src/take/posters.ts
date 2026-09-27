/**
 * posters.ts — every project poster, the lock-screen wallpaper and the shared SVG filters,
 * as one block of <symbol>s rendered once per page (see Poster.tsx).
 *
 * Posters are drawn in a 400×400 box with `slice`, so they crop instead of stretching at any
 * aspect. The film clones them behind its liquid glass, so they must stay plain SVG.
 * The bug poster has two aligned states: "raw" underneath and "triaged" inside the #wipe
 * clip, whose width the film drives with its slider.
 */

import type { ShapeId } from '../lib/types'

export interface PosterInfo {
  /** Symbol id, used as `<use href="#…">`. */
  sym: string
  /** The poster's background, also used for the caption scrim on tiles. */
  bg: string
  /** Light poster: text on it is ink, not white. */
  light: boolean
}

const BG: Record<ShapeId, string> = {
  bug: '#D63A2A', loop: '#121212', orbit: '#2F2BB5', candles: '#0B8B79', globe: '#EF6A21', clocks: '#1C7446',
  coins: '#8CB7E6', browser: '#F2C230', tictactoe: '#EA4A77', battleship: '#16243F', generic: '#0B0B0C',
}
const LIGHT = new Set<ShapeId>(['coins', 'browser'])

export function posterFor(shape: ShapeId): PosterInfo {
  return { sym: `p-${shape}`, bg: BG[shape], light: LIGHT.has(shape) }
}

const MONO = 'font-family="Geist Mono, monospace"'
const f1 = (n: number) => n.toFixed(1)

function gridPath(step: number, n = 400): string {
  let d = ''
  for (let i = step; i < n; i += step) d += `M${i} 0V${n}M0 ${i}H${n}`
  return d
}

function bug(x: number, y: number, rot: number, body: string, line: string): string {
  return `<g transform="translate(${x} ${y}) rotate(${rot})">
    <path d="M-9 -3L-18 -9M-10 4L-20 5M-9 11L-16 18M9 -3L18 -9M10 4L20 5M9 11L16 18M-3 -18L-7 -25M3 -18L7 -25" stroke="${body}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
    <ellipse cx="0" cy="3" rx="11" ry="14" fill="${body}"/><circle cx="0" cy="-13" r="6.5" fill="${body}"/><path d="M0 -9V16" stroke="${line}" stroke-width="1.1"/></g>`
}

const reticle = (c: string) =>
  `<g fill="none" stroke="${c}"><circle cx="200" cy="200" r="74" stroke-width="2.4"/><path d="M200 108v28M200 264v28M108 200h28M264 200h28" stroke-width="2.4"/></g>`

function symbol(id: string, body: string, viewBox = '0 0 400 400'): string {
  return `<symbol id="${id}" viewBox="${viewBox}" preserveAspectRatio="xMidYMid slice">${body}</symbol>`
}

function posterBug(): string {
  return symbol('p-bug', `
    <rect width="400" height="400" fill="${BG.bug}"/>
    <path d="${gridPath(20)}" stroke="#fff" stroke-opacity=".09" stroke-width=".6"/>
    ${reticle('#fff')}<circle cx="200" cy="200" r="44" fill="none" stroke="#fff" stroke-width="1.1" stroke-dasharray="3 5" opacity=".75"/>
    ${bug(226, 181, 28, '#141414', BG.bug)}
    <g ${MONO} font-size="4.6" fill="#fff" fill-opacity=".62">
      <text x="282" y="112">TypeError: Cannot read 'id' of undefined</text><text x="282" y="119">  at Checkout.tsx:88:14</text>
      <text x="282" y="132">POST /api/checkout → 500</text><text x="282" y="139">GET  /api/cart → 304</text>
      <text x="282" y="152">console.warn ×14</text><text x="282" y="159">rrweb buffer · 30 s</text><text x="282" y="166">anon_7f2c · Chrome 129 · macOS</text>
      <text x="282" y="236">“the pay button does nothing??”</text>
      <text x="282" y="252">#231 checkout broken</text><text x="282" y="259">#214 cant pay</text><text x="282" y="266">#198 button???</text><text x="282" y="273">#197 pay not working</text>
    </g>
    <g clip-path="url(#wipe)">
      <rect width="400" height="400" fill="#151414"/>
      <path d="${gridPath(20)}" stroke="#fff" stroke-opacity=".05" stroke-width=".6"/>
      ${reticle('#FF5A3C')}<path d="M170 176v-6h6M230 176v-6h-6M170 224v6h6M230 224v6h-6" stroke="#FF5A3C" stroke-width="2" fill="none"/>
      ${bug(200, 200, 0, '#F2EEE6', '#151414')}
      <text x="282" y="120" ${MONO} font-size="5" fill="#FF5A3C" letter-spacing=".08em">TRIAGED BY CLAUDE</text>
      <g transform="translate(282 128)">
        <rect width="104" height="146" rx="7" fill="#F2EEE6"/>
        <rect x="10" y="11" width="34" height="13" rx="6.5" fill="#FF5A3C"/><text x="27" y="20.4" text-anchor="middle" ${MONO} font-size="6.6" fill="#fff">SEV-2</text>
        <text x="10" y="42" font-family="Geist, sans-serif" font-weight="650" font-size="9.4" fill="#141414">Checkout button</text>
        <text x="10" y="53" font-family="Geist, sans-serif" font-weight="650" font-size="9.4" fill="#141414">unresponsive</text>
        <text x="10" y="66" ${MONO} font-size="5.6" fill="#8C8679">duplicate of #214</text><text x="10" y="74" ${MONO} font-size="5.6" fill="#8C8679">4 reports → 1 issue</text>
        <g ${MONO} font-size="5.8" fill="#44413B"><text x="10" y="92">1  add item to cart</text><text x="10" y="101">2  tap Pay</text><text x="10" y="110">3  no request sent</text></g>
        <rect x="10" y="119" width="84" height="18" rx="4" fill="#141414"/><text x="16" y="130.6" ${MONO} font-size="5.8" fill="#F2EEE6">fix: guard cart.id</text>
      </g>
    </g>
    <rect id="wipeLine" x="-4" y="-10" width="1.4" height="420" fill="#fff"/>`)
}

function posterOrbit(): string {
  const ep = (rx: number, ry: number, rot: number, a: number) => {
    const r = rot * Math.PI / 180, x = rx * Math.cos(a * Math.PI / 180), y = ry * Math.sin(a * Math.PI / 180)
    return [200 + x * Math.cos(r) - y * Math.sin(r), 200 + x * Math.sin(r) + y * Math.cos(r)]
  }
  const drones = [ep(150, 52, -18, 20), ep(150, 52, -18, 150), ep(150, 52, -18, 256), ep(108, 36, 22, 84), ep(108, 36, 22, 300)]
    .map(([x, y], i) => `<rect x="${f1(x - 5)}" y="${f1(y - 5)}" width="10" height="10" transform="rotate(${i * 23} ${f1(x)} ${f1(y)})" fill="#FFC53D"/>`).join('')
  return symbol('p-orbit', `
    <rect width="400" height="400" fill="${BG.orbit}"/>
    <g fill="none" stroke="#F2EEE6" stroke-opacity=".75" stroke-width="1.6">
      <ellipse cx="200" cy="200" rx="150" ry="52" transform="rotate(-18 200 200)"/><ellipse cx="200" cy="200" rx="108" ry="36" transform="rotate(22 200 200)"/>
      <circle cx="200" cy="200" r="66" stroke-dasharray="2 6"/></g>
    <circle cx="200" cy="200" r="28" fill="#F2EEE6"/><path d="M178 190a28 28 0 0 1 44 0" fill="none" stroke="${BG.orbit}" stroke-width="2" opacity=".5"/>
    ${drones}`)
}

function posterCandles(): string {
  const C = [[88, 262, 240, 230, 272], [116, 240, 252, 234, 260], [144, 250, 222, 212, 256], [172, 222, 206, 196, 230], [200, 206, 214, 200, 224],
    [228, 214, 184, 176, 220], [256, 184, 170, 160, 192], [284, 170, 178, 164, 186], [312, 178, 142, 132, 184]]
  const candles = C.map(([x, o, c, h, l]) => {
    const up = c < o, t = Math.min(o, c), b = Math.max(o, c)
    return `<path d="M${x} ${h}V${l}" stroke="#F2EEE6" stroke-width="1.6"/><rect x="${x - 7}" y="${t}" width="14" height="${b - t}" rx="1.5" fill="${up ? '#F2EEE6' : BG.candles}" stroke="#F2EEE6" stroke-width="1.6"/>`
  }).join('')
  return symbol('p-candles', `
    <rect width="400" height="400" fill="${BG.candles}"/>
    <path d="M60 290H340M60 240H340M60 190H340M60 140H340" stroke="#F2EEE6" stroke-opacity=".14" stroke-width="1"/>
    ${candles}
    <path d="M74 258C130 250 170 214 222 196S292 160 330 140" fill="none" stroke="#FFC53D" stroke-width="2" stroke-dasharray="4 4"/>`)
}

function posterClocks(): string {
  let clocks = ''
  for (let i = 0; i < 12; i++) {
    const x = 95 + (i % 4) * 70, y = 130 + Math.floor(i / 4) * 70, ah = (i * 37 + 20) * Math.PI / 180, am = (i * 83 + 40) * Math.PI / 180
    clocks += `<circle cx="${x}" cy="${y}" r="25" fill="none" stroke="#F2EEE6" stroke-width="2"/><path d="M${x} ${y}L${f1(x + 11 * Math.sin(ah))} ${f1(y - 11 * Math.cos(ah))}M${x} ${y}L${f1(x + 18 * Math.sin(am))} ${f1(y - 18 * Math.cos(am))}" stroke="#F2EEE6" stroke-width="2" stroke-linecap="round"/>`
  }
  return symbol('p-clocks', `<rect width="400" height="400" fill="${BG.clocks}"/>${clocks}`)
}

function posterCoins(): string {
  let coins = ''
  for (let i = 0; i < 6; i++) {
    const y = 262 - i * 17, x = 200 + (i % 2 ? 5 : -4)
    coins += `<path d="M${x - 62} ${y}v10a62 16 0 0 0 124 0v-10" fill="#F2EEE6" stroke="#141414" stroke-width="1.8"/><ellipse cx="${x}" cy="${y}" rx="62" ry="16" fill="#F2EEE6" stroke="#141414" stroke-width="1.8"/>`
  }
  return symbol('p-coins', `<rect width="400" height="400" fill="${BG.coins}"/>${coins}
    <text x="200" y="146" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="800" font-size="30" fill="#141414" style="font-stretch:125%">$0.0042</text>`)
}

function posterBattleship(): string {
  let d = ''
  for (let i = 0; i <= 10; i++) d += `M${100 + i * 20} 100V300M100 ${100 + i * 20}H300`
  return symbol('p-battleship', `
    <rect width="400" height="400" fill="${BG.battleship}"/>
    <path d="${d}" stroke="#F2EEE6" stroke-opacity=".16" stroke-width="1"/>
    <rect x="162" y="182" width="76" height="16" rx="8" fill="#F2EEE6"/><rect x="262" y="122" width="16" height="56" rx="8" fill="#F2EEE6" fill-opacity=".85"/>
    <path d="M184 184l12 12M196 184l-12 12M204 184l12 12M216 184l-12 12" stroke="#FF5A3C" stroke-width="3" stroke-linecap="round"/>
    <g fill="#F2EEE6" fill-opacity=".55"><circle cx="130" cy="130" r="3"/><circle cx="150" cy="250" r="3"/><circle cx="230" cy="270" r="3"/><circle cx="110" cy="210" r="3"/><circle cx="290" cy="250" r="3"/></g>
    <g fill="none" stroke="#FF5A3C" stroke-width="2"><circle cx="230" cy="190" r="15"/><path d="M230 170v8M230 202v8M210 190h8M242 190h8"/></g>`)
}

function wallpaper(): string {
  let refl = ''
  for (let i = 0; i < 16; i++) {
    const y = 612 + i * 13, w = 170 - i * 9 + (i % 3) * 14
    refl += `<rect x="${770 - w / 2}" y="${y}" width="${w}" height="${3 + (i % 2)}" rx="1.5" fill="#FCE2A2" fill-opacity="${(.72 - i * .036).toFixed(2)}"/>`
  }
  let stars = ''
  for (let i = 0; i < 26; i++) {
    const x = (i * 467) % 1200, y = 30 + (i * 211) % 300
    stars += `<circle cx="${x}" cy="${y}" r="${(i % 3) * .5 + .8}" fill="#fff" fill-opacity="${(.35 + (i % 4) * .12).toFixed(2)}"/>`
  }
  return symbol('wallpaper', `
    <defs>
      <linearGradient id="wsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#171C49"/><stop offset=".42" stop-color="#4C2F68"/><stop offset=".78" stop-color="#D2603F"/><stop offset="1" stop-color="#F3A95A"/></linearGradient>
      <linearGradient id="wsea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E68A4C"/><stop offset=".35" stop-color="#9B4146"/><stop offset="1" stop-color="#1A1942"/></linearGradient>
    </defs>
    <rect width="1200" height="600" fill="url(#wsky)"/>${stars}
    <circle cx="770" cy="560" r="86" fill="#FCE2A2"/>
    <g fill="#2A1C38">
      <rect x="0" y="592" width="1200" height="8"/><rect x="250" y="584" width="110" height="16"/><rect x="372" y="578" width="120" height="22"/>
      <rect x="500" y="572" width="178" height="28"/><path d="M548 572Q548 530 589 525Q630 530 630 572Z"/><rect x="584" y="506" width="10" height="21"/><circle cx="589" cy="503" r="5"/>
      <rect x="680" y="452" width="24" height="148"/><rect x="677" y="446" width="30" height="18"/><path d="M676 446L692 404L708 446Z"/>
      <rect x="716" y="578" width="150" height="22"/><rect x="880" y="586" width="120" height="14"/>
    </g>
    <rect y="600" width="1200" height="400" fill="url(#wsea)"/>${refl}`, '0 0 1200 1000')
}

/** The whole defs block: filters, the wipe clip, every poster and the wallpaper. */
export function posterDefsMarkup(): string {
  return `
  <filter id="goo" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
    <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="b"/>
    <feColorMatrix in="b" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" result="g"/>
    <feComposite in="SourceGraphic" in2="g" operator="atop"/>
  </filter>
  <clipPath id="wipe" clipPathUnits="userSpaceOnUse"><rect id="wipeRect" x="-10" y="-10" width="0" height="420"/></clipPath>
  ${posterBug()}
  ${symbol('p-loop', `
    <rect width="400" height="400" fill="${BG.loop}"/>
    <circle cx="200" cy="200" r="96" fill="none" stroke="#F2EEE6" stroke-width="30"/>
    <circle cx="200" cy="200" r="96" fill="none" stroke="${BG.loop}" stroke-width="2" stroke-dasharray="1 9"/>
    <circle cx="283" cy="152" r="11" fill="#FF5A3C"/>
    <text x="200" y="209" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="800" font-size="26" fill="#F2EEE6" style="font-stretch:125%">N°12</text>
    <text x="200" y="332" text-anchor="middle" ${MONO} font-size="8" letter-spacing=".2em" fill="#F2EEE6" fill-opacity=".6">NEWS · GUIDES · LABS</text>`)}
  ${posterOrbit()}
  ${posterCandles()}
  ${symbol('p-globe', `
    <rect width="400" height="400" fill="${BG.globe}"/>
    <g fill="none" stroke="#F2EEE6" stroke-width="3"><circle cx="200" cy="200" r="96"/><ellipse cx="200" cy="200" rx="42" ry="96"/><ellipse cx="200" cy="200" rx="78" ry="96" stroke-width="1.6"/><path d="M104 200H296M117 152H283M117 248H283" stroke-width="1.6"/></g>
    <path d="M318 146A128 128 0 0 1 300 290" fill="none" stroke="#141414" stroke-width="3"/><path d="M292 282l8 10 9-11" fill="none" stroke="#141414" stroke-width="3" stroke-linejoin="round"/>
    <text x="200" y="330" text-anchor="middle" ${MONO} font-size="10" fill="#141414">203.0.113.7 → 198.51.100.4</text>`)}
  ${posterClocks()}
  ${posterCoins()}
  ${symbol('p-browser', `
    <rect width="400" height="400" fill="${BG.browser}"/>
    <rect x="92" y="126" width="216" height="148" rx="9" fill="#F2EEE6" stroke="#141414" stroke-width="3"/>
    <path d="M92 150H308" stroke="#141414" stroke-width="3"/><circle cx="106" cy="138" r="4" fill="#141414"/><circle cx="120" cy="138" r="4" fill="#141414"/><circle cx="134" cy="138" r="4" fill="#141414"/>
    <text x="110" y="180" ${MONO} font-size="13" fill="#141414">&lt;html&gt;</text>
    <path d="M110 202H270M110 218H236M110 234H252M110 250H206" stroke="#141414" stroke-width="5" stroke-linecap="round" opacity=".8"/>`)}
  ${symbol('p-tictactoe', `
    <rect width="400" height="400" fill="${BG.tictactoe}"/>
    <path d="M167 104V296M233 104V296M104 167H296M104 233H296" stroke="#F2EEE6" stroke-width="6" stroke-linecap="round"/>
    <g stroke="#141414" stroke-width="8" stroke-linecap="round"><path d="M117 117l36 36M153 117l-36 36M183 183l34 34M217 183l-34 34M247 247l36 36M283 247l-36 36"/></g>
    <g fill="none" stroke="#F2EEE6" stroke-width="7"><circle cx="266" cy="135" r="19"/><circle cx="135" cy="266" r="19"/><circle cx="266" cy="200" r="19"/></g>`)}
  ${posterBattleship()}
  ${symbol('p-generic', `
    <rect width="400" height="400" fill="${BG.generic}"/>
    <path d="${gridPath(20)}" stroke="#F2EEE6" stroke-opacity=".07" stroke-width=".6"/>
    <circle cx="200" cy="200" r="96" fill="none" stroke="#F2EEE6" stroke-opacity=".35" stroke-width="1.4" stroke-dasharray="2 6"/>
    <circle cx="200" cy="200" r="40" fill="#F2EEE6"/>`)}
  ${wallpaper()}`
}
