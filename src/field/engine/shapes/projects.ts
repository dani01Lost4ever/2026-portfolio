/**
 * Project shapes added after v3, in the same visual language: outlines drawn with dense
 * points, a few highlighted features, and one idle motion each (see the flag table in shaders.ts).
 */
import { BS_CELL, COIN_PITCH, TTT_CELL, TTT_CY } from '../shaders'
import { TAU, W, build, clamp, jit, lerp, rng, seg, unit, type Rand, type Vec3 } from '../math'

/* ---------- helpers ---------- */

/** Point on the outline of a rounded rectangle (xy plane), t in [0, 1) around the perimeter. */
function roundRect(t: number, x0: number, y0: number, x1: number, y1: number, rad: number): [number, number] {
  const w = x1 - x0 - 2 * rad
  const h = y1 - y0 - 2 * rad
  const arc = (Math.PI / 2) * rad
  const per = 2 * w + 2 * h + 4 * arc
  let d = t * per
  // top edge (left → right), then clockwise
  if (d < w) return [x0 + rad + d, y1]
  d -= w
  if (d < arc) { const a = Math.PI / 2 - d / rad; return [x1 - rad + Math.cos(a) * rad, y1 - rad + Math.sin(a) * rad] }
  d -= arc
  if (d < h) return [x1, y1 - rad - d]
  d -= h
  if (d < arc) { const a = -d / rad; return [x1 - rad + Math.cos(a) * rad, y0 + rad + Math.sin(a) * rad] }
  d -= arc
  if (d < w) return [x1 - rad - d, y0]
  d -= w
  if (d < arc) { const a = -Math.PI / 2 - d / rad; return [x0 + rad + Math.cos(a) * rad, y0 + rad + Math.sin(a) * rad] }
  d -= arc
  if (d < h) return [x0, y0 + rad + d]
  d -= h
  const a = Math.PI - d / rad
  return [x0 + rad + Math.cos(a) * rad, y1 - rad + Math.sin(a) * rad]
}

/** Uniform point in a disc of radius rad. */
function disc(r: Rand, rad: number): [number, number] {
  const a = r() * TAU
  const d = rad * Math.sqrt(r())
  return [Math.cos(a) * d, Math.sin(a) * d]
}

/* ---------- coins: OpenAI Cost Calculator ---------- */

/**
 * A bar chart of cost per model, drawn as coin stacks of different heights. Every stack turns
 * slowly about its own axis (reeded rims make the turn visible), a loose coin spins on its edge
 * above the priciest stack, and a price tick climbs the y axis with a dashed guide across.
 */
export function genCoins(N: number): Float32Array {
  const heights = [3, 5, 4, 8, 6]
  const M = heights.length
  const R = 0.5
  const pitch = 0.3
  const th = 0.12
  const base = -1.5
  const cx = (k: number): number => (k - (M - 1) / 2) * COIN_PITCH
  let tallest = 0
  heights.forEach((h, k) => { if (h > heights[tallest]) tallest = k })
  const coins: { k: number; c: number }[] = []
  heights.forEach((h, k) => { for (let c = 0; c < h; c++) coins.push({ k, c }) })
  const axisX = cx(0) - 0.95
  const topY = base + heights[tallest] * pitch
  const floatY = topY + 0.8
  return build(N, [
    // coin rims: mostly the front half of each coin's top and bottom edge, so a stack reads as
    // countable discs; a sparse back half keeps the volume
    [44, (r) => {
      const q = coins[Math.floor(r() * coins.length)]
      const a = r() < 0.82 ? lerp(-0.12, Math.PI + 0.12, r()) : r() * TAU
      const y0 = base + q.c * pitch
      const u = r()
      const y = u < 0.42 ? y0 : u < 0.84 ? y0 + th : y0 + r() * th
      const rad = R + jit(r, 0.01)
      return [cx(q.k) + Math.cos(a) * rad, y + jit(r, 0.006), Math.sin(a) * rad, W(8, 0.9)]
    }],
    // the top face of every stack, with an embossed inner ring
    [12, (r) => {
      const k = Math.floor(r() * M)
      const y = base + (heights[k] - 1) * pitch + th
      let p: [number, number]
      if (r() < 0.5) { const a = r() * TAU; const rr = R * 0.6 + jit(r, 0.012); p = [Math.cos(a) * rr, Math.sin(a) * rr] }
      else p = disc(r, R * 0.96)
      return [cx(k) + p[0], y + jit(r, 0.006), p[1], W(8, 0.6)]
    }],
    // loose coin standing on its edge, spinning above the priciest stack
    [9, (r) => {
      const u = r()
      const rr = u < 0.55 ? 0.44 + jit(r, 0.012) : u < 0.8 ? 0.27 + jit(r, 0.012) : 0.44 * Math.sqrt(r())
      const a = r() * TAU
      return [cx(tallest) + Math.cos(a) * rr, floatY + Math.sin(a) * rr, jit(r, 0.035), W(8, 0.42)]
    }],
    // axes: baseline and y axis with ticks
    [11, (r) => {
      const u = r()
      if (u < 0.45) return [lerp(axisX, cx(M - 1) + 0.8, r()), base - 0.1 + jit(r, 0.01), jit(r, 0.01), 0]
      if (u < 0.8) return [axisX + jit(r, 0.01), lerp(base - 0.1, floatY + 0.4, r()), jit(r, 0.01), 0]
      const ty = base + Math.floor(r() * 7) * 0.5
      return [axisX - lerp(0, 0.16, r()), ty, 0, W(1, 0)]
    }],
    // rising price tick: an up-chevron on the axis and a dashed guide across the chart
    [5, (r) => {
      if (r() < 0.55) {
        const s = r() * 2 - 1
        return [axisX - 0.3 + s * 0.2 + jit(r, 0.015), base + 0.12 - Math.abs(s) * 0.2 + jit(r, 0.015), 0.05, W(9, 0.9)]
      }
      let x: number
      do { x = lerp(axisX, cx(M - 1) + 0.6, r()) } while ((((x * 5) % 1) + 1) % 1 > 0.55)
      return [x, base + jit(r, 0.01), 0, W(9, 0.1)]
    }],
    // per-stack value markers: a bright dot floating above each stack
    [3, (r, j) => {
      const k = j % M
      const v = unit(r)
      return [cx(k) + v[0] * 0.06, base + heights[k] * pitch + 0.3 + v[1] * 0.06, v[2] * 0.06, W(1, 0)]
    }],
  ], 0.5, 101)
}

/* ---------- browser: Original Portfolio (2023, vanilla + particles.js) ---------- */

/**
 * A browser window wireframe: frame with a title bar, three traffic-light dots and an address
 * bar; three content blocks (About, Work, Contacts); and a particles.js-style constellation
 * drifting behind them.
 */
export function genBrowser(N: number): Float32Array {
  const X0 = -3.2, X1 = 3.2, Y0 = -2.15, Y1 = 2.15
  const bar = 1.6
  const r0 = rng(29)
  // constellation nodes inside the window body, behind the blocks
  const nodes: Vec3[] = []
  while (nodes.length < 22) {
    const p: Vec3 = [lerp(X0 + 0.25, X1 - 0.25, r0()), lerp(Y0 + 0.2, bar - 0.2, r0()), -0.35 - r0() * 0.4]
    if (nodes.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > 0.75)) nodes.push(p)
  }
  const links: [number, number][] = []
  nodes.forEach((a, i) => {
    const near = nodes
      .map((b, j) => ({ j, d: Math.hypot(a[0] - b[0], a[1] - b[1]) }))
      .filter((o) => o.j > i && o.d < 1.5)
      .sort((p, q) => p.d - q.d)
      .slice(0, 2)
    for (const o of near) links.push([i, o.j])
  })
  // content blocks: [x0, y0, x1, y1]
  const about: [number, number, number, number] = [-2.95, 0.15, -0.2, 1.35]
  const work: [number, number, number, number] = [0.2, -1.9, 2.95, 1.35]
  const contact: [number, number, number, number] = [-2.95, -1.9, -0.2, -0.2]
  const blocks = [about, work, contact]
  return build(N, [
    // window frame, a glint travels round it
    [21, (r) => {
      const t = r()
      const p = roundRect(t, X0, Y0, X1, Y1, 0.2)
      return [p[0] + jit(r, 0.012), p[1] + jit(r, 0.012), jit(r, 0.01), W(2, t)]
    }],
    // title bar divider
    [4, (r) => [lerp(X0, X1, r()), bar + jit(r, 0.01), 0, 0]],
    // traffic lights
    [4, (r, j) => {
      const k = j % 3
      const p = disc(r, 0.1)
      return [X0 + 0.34 + k * 0.3 + p[0], (bar + Y1) / 2 + p[1], 0.02, W(1, 0)]
    }],
    // address bar + a few "url" dots
    [6, (r) => {
      if (r() < 0.8) {
        const p = roundRect(r(), -1.55, bar + 0.14, 2.2, Y1 - 0.14, 0.12)
        return [p[0], p[1], 0, 0]
      }
      return [lerp(-1.3, 0.4, r()), (bar + Y1) / 2 + jit(r, 0.02), 0, 0]
    }],
    // block outlines
    [21, (r, j) => {
      const b = blocks[j % 3]
      const p = roundRect(r(), b[0], b[1], b[2], b[3], 0.1)
      return [p[0] + jit(r, 0.01), p[1] + jit(r, 0.01), 0.05, 0]
    }],
    // About: avatar circle + three text lines
    [6, (r) => {
      const b = about
      if (r() < 0.4) {
        const a = r() * TAU
        return [b[0] + 0.55 + Math.cos(a) * 0.3, (b[1] + b[3]) / 2 + Math.sin(a) * 0.3, 0.05, W(1, 0)]
      }
      const line = Math.floor(r() * 3)
      const len = [1.6, 1.25, 1.45][line]
      return [b[0] + 1.05 + r() * len, b[3] - 0.32 - line * 0.28, 0.05, 0]
    }],
    // Work: 2×2 thumbnails
    [9, (r) => {
      const b = work
      const k = Math.floor(r() * 4)
      const cw = (b[2] - b[0] - 0.6) / 2
      const ch = (b[3] - b[1] - 0.6) / 2
      const x0 = b[0] + 0.2 + (k % 2) * (cw + 0.2)
      const y0 = b[1] + 0.2 + (k < 2 ? ch + 0.2 : 0)
      const p = roundRect(r(), x0, y0, x0 + cw, y0 + ch, 0.06)
      return [p[0], p[1], 0.05, 0]
    }],
    // Contacts: two lines and a button
    [5, (r) => {
      const b = contact
      if (r() < 0.55) {
        const p = roundRect(r(), b[0] + 0.25, b[1] + 0.22, b[0] + 1.35, b[1] + 0.6, 0.06)
        return [p[0], p[1], 0.05, W(1, 0)]
      }
      const line = Math.floor(r() * 2)
      return [b[0] + 0.25 + r() * [2.1, 1.5][line], b[3] - 0.32 - line * 0.28, 0.05, 0]
    }],
    // particles.js constellation: nodes
    [8, (r, j) => {
      const n = nodes[j % nodes.length]
      const v = unit(r)
      const d = 0.075 * Math.cbrt(r())
      return [n[0] + v[0] * d, n[1] + v[1] * d, n[2] + v[2] * d, W(10, 0.9)]
    }],
    // and their links
    [10, (r, j) => {
      const L = links[j % links.length]
      const p = seg(r, nodes[L[0]], nodes[L[1]], 0.008)
      return [p[0], p[1], p[2], W(10, 0.1)]
    }],
  ], 0.05, 111)
}

/* ---------- tictactoe: Tic-Tac-Toe vs AI (minimax + alpha-beta) ---------- */

/**
 * A 3×3 board mid-game with X and O marks; the AI's reply (an O) flares every few seconds.
 * Below and behind it the minimax tree fans out; pruned branches are dimmed and cut, and the
 * principal variation carries a pulse back up to the board.
 */
export function genTicTacToe(N: number): Float32Array {
  const C = TTT_CELL
  const cy = TTT_CY
  const half = C * 1.5
  const cell = (col: number, row: number): [number, number] => [(col - 1) * C, cy + (1 - row) * C]
  const xs: [number, number][] = [[0, 0], [1, 1], [2, 1]]
  const os: [number, number][] = [[2, 0], [0, 1]]
  const ai: [number, number] = [2, 2]
  // tree: the board is the root; three replies, each with three counter-replies
  const L1 = [-2.3, 0, 2.3].map((x) => [x, -0.95, -0.55] as Vec3)
  const L2: Vec3[] = []
  L1.forEach((p) => { for (let k = -1; k <= 1; k++) L2.push([p[0] + k * 0.72, -2.05, -1.1]) })
  const rootP: Vec3 = [0, cy - half - 0.12, 0]
  // edges: [from, to, pruned, onPath]
  const pv = { l1: 2, l2: 7 } // principal variation: right reply, its middle child
  const edges: { a: Vec3; b: Vec3; pruned: boolean; path: boolean; depth: number }[] = []
  L1.forEach((p, i) => edges.push({ a: rootP, b: [p[0], p[1] + 0.16, p[2]], pruned: false, path: i === pv.l1, depth: 0 }))
  L2.forEach((p, i) => {
    const par = L1[Math.floor(i / 3)]
    // alpha-beta: the first subtree is searched fully, later ones get cut after their first child
    const pruned = Math.floor(i / 3) === 0 ? false : i % 3 === 2 || (Math.floor(i / 3) === 1 && i % 3 === 1)
    edges.push({ a: [par[0], par[1] - 0.16, par[2]], b: [p[0], p[1] + 0.1, p[2]], pruned, path: i === pv.l2, depth: 1 })
  })
  const cut = edges.filter((e) => e.pruned)
  const nodesAll: { p: Vec3; pruned: boolean; lvl: number }[] = [
    ...L1.map((p) => ({ p, pruned: false, lvl: 1 })),
    ...L2.map((p, i) => ({ p, pruned: edges[3 + i].pruned, lvl: 2 })),
  ]
  return build(N, [
    // board lines
    [30, (r) => {
      const k = Math.floor(r() * 4)
      const s = lerp(-half, half, r())
      const o = (k % 2 ? 0.5 : -0.5) * C
      return k < 2 ? [o + jit(r, 0.018), cy + s, jit(r, 0.02), 0] : [s, cy + o + jit(r, 0.018), jit(r, 0.02), 0]
    }],
    // X marks
    [12, (r, j) => {
      const m = xs[j % xs.length]
      const c = cell(m[0], m[1])
      const s = lerp(-0.26, 0.26, r())
      const d = r() < 0.5 ? 1 : -1
      return [c[0] + s + jit(r, 0.02), c[1] + s * d + jit(r, 0.02), jit(r, 0.02), W(1, 0)]
    }],
    // O marks
    [9, (r, j) => {
      const m = os[j % os.length]
      const c = cell(m[0], m[1])
      const a = r() * TAU
      const rr = 0.25 + jit(r, 0.02)
      return [c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr, jit(r, 0.02), 0]
    }],
    // the AI's move
    [6, (r) => {
      const c = cell(ai[0], ai[1])
      const a = r() * TAU
      const rr = 0.25 + jit(r, 0.025)
      return [c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr, jit(r, 0.02), W(12, 0)]
    }],
    // tree edges
    [22, (r, j) => {
      const e = edges[j % edges.length]
      const t = r()
      const p: Vec3 = [lerp(e.a[0], e.b[0], t) + jit(r, 0.012), lerp(e.a[1], e.b[1], t) + jit(r, 0.012), lerp(e.a[2], e.b[2], t)]
      if (e.pruned) return [p[0], p[1], p[2], W(11, 0)]
      // pulse runs leaf → root along the principal variation
      if (e.path) return [p[0], p[1], p[2], W(6, clamp(1 - (e.depth + t) / 2, 0, 1))]
      return [p[0], p[1], p[2], 0]
    }],
    // tree nodes: rings for the replies, dots for the leaves
    [14, (r, j) => {
      const nd = nodesAll[j % nodesAll.length]
      const fl = nd.pruned ? W(11, 0) : W(1, 0)
      if (nd.lvl === 1) {
        const a = r() * TAU
        const rr = 0.15 + jit(r, 0.015)
        return [nd.p[0] + Math.cos(a) * rr, nd.p[1] + Math.sin(a) * rr, nd.p[2], fl]
      }
      const v = unit(r)
      const d = 0.09 * Math.cbrt(r())
      return [nd.p[0] + v[0] * d, nd.p[1] + v[1] * d, nd.p[2] + v[2] * d, fl]
    }],
    // alpha-beta cuts: a short bright slash across each pruned edge
    [4, (r, j) => {
      const e = cut[j % cut.length]
      const m: Vec3 = [lerp(e.a[0], e.b[0], 0.45), lerp(e.a[1], e.b[1], 0.45), lerp(e.a[2], e.b[2], 0.45)]
      const s = lerp(-0.13, 0.13, r())
      return [m[0] + s, m[1] - s * 0.8, m[2], W(1, 0)]
    }],
    // a faint ghost of the board plane
    [4, (r) => [lerp(-half, half, r()), cy + lerp(-half, half, r()), -0.08, W(11, 0)]],
  ], 0.1, 121)
}

/* ---------- battleship: Battleship vs AI (hunt/target) ---------- */

/**
 * A 10×10 grid plane seen in perspective with five ship silhouettes. A hit on the cruiser sends
 * ripples across the board, and the target-mode probe hops cell by cell along the ship's axis.
 */
export function genBattleship(N: number): Float32Array {
  const C = BS_CELL
  const G = 10
  const E = (G / 2) * C
  const cc = (i: number): number => (i - (G - 1) / 2) * C
  // ships: [col, row, length, horizontal]
  const ships: [number, number, number, boolean][] = [
    [1, 1, 5, true],
    [8, 2, 4, false],
    [2, 6, 3, true],
    [6, 5, 3, false],
    [0, 9, 2, true],
  ]
  const hit: [number, number] = [2, 6]
  const misses: [number, number][] = [[4, 3], [7, 8], [5, 1], [1, 4], [9, 7], [3, 9]]
  const r0 = rng(43)
  return build(N, [
    // grid lines on the water plane
    [33, (r) => {
      const k = Math.floor(r() * (G + 1))
      const s = lerp(-E, E, r())
      const o = -E + k * C
      const edge = k === 0 || k === G
      return r() < 0.5
        ? [o + jit(r, 0.01), 0, s, edge ? W(1, 0) : 0]
        : [s, 0, o + jit(r, 0.01), edge ? W(1, 0) : 0]
    }],
    // ship hulls: pointed-bow outlines, slightly raised
    [18, (r, j) => {
      const sh = ships[j % ships.length]
      const len = sh[2] * C - 0.12
      const wid = C * 0.7
      const t = r()
      // hull outline in ship space (u along the axis, v across)
      let u: number, v: number
      const side = r() < 0.5 ? 1 : -1
      if (t < 0.8) {
        u = lerp(-len / 2, len / 2, t / 0.8)
        const taper = clamp((len / 2 - Math.abs(u)) / (wid * 0.9), 0, 1)
        v = side * (wid / 2) * Math.sqrt(taper)
      } else {
        u = side * (len / 2) * (r() < 0.5 ? 1 : 0.999)
        v = jit(r, 0.02)
      }
      const h = 0.14 + r() * 0.14
      const mid: [number, number] = sh[3] ? [cc(sh[0]) + (sh[2] - 1) * C / 2, cc(sh[1])] : [cc(sh[0]), cc(sh[1]) + (sh[2] - 1) * C / 2]
      return sh[3] ? [mid[0] + u, h, mid[1] + v, W(1, 0)] : [mid[0] + v, h, mid[1] + u, W(1, 0)]
    }],
    // decks and superstructures
    [16, (r, j) => {
      const sh = ships[j % ships.length]
      const len = sh[2] * C - 0.3
      const u = lerp(-len / 2, len / 2, r())
      const v = jit(r, C * 0.18)
      const tower = Math.abs(u) < C * 0.35 && r() < 0.5
      const h = tower ? 0.22 + r() * 0.22 : 0.2 + jit(r, 0.02)
      const mid: [number, number] = sh[3] ? [cc(sh[0]) + (sh[2] - 1) * C / 2, cc(sh[1])] : [cc(sh[0]), cc(sh[1]) + (sh[2] - 1) * C / 2]
      const fl = tower ? W(1, 0) : 0
      return sh[3] ? [mid[0] + u, h, mid[1] + v, fl] : [mid[0] + v, h, mid[1] + u, fl]
    }],
    // hit ripples, three rings out of phase
    [12, (r, j) => {
      const a = r() * TAU
      return [cc(hit[0]) + Math.cos(a) * 0.05, 0, cc(hit[1]) + Math.sin(a) * 0.05, W(13, (j % 3) / 3)]
    }],
    // hit marker: a bright burst on the struck cell
    [4, (r) => {
      const v = unit(r)
      return [cc(hit[0]) + v[0] * 0.12, 0.3 + Math.abs(v[1]) * 0.18, cc(hit[1]) + v[2] * 0.12, W(6, r0() * 0.2)]
    }],
    // target probe: a crosshair that hops along the ship's axis
    [6, (r) => {
      const k = r()
      const s = lerp(-0.2, 0.2, r())
      const p: [number, number] = k < 0.5 ? [s, 0] : [0, s]
      if (r() < 0.45) { const a = r() * TAU; p[0] = Math.cos(a) * 0.17; p[1] = Math.sin(a) * 0.17 }
      return [cc(hit[0]) + p[0], 0.1, cc(hit[1]) + p[1], W(14, 0.4)]
    }],
    // misses: small dim pegs
    [5, (r, j) => {
      const m = misses[j % misses.length]
      const v = unit(r)
      return [cc(m[0]) + v[0] * 0.07, 0.04 + Math.abs(v[1]) * 0.06, cc(m[1]) + v[2] * 0.07, 0]
    }],
  ], 0.62, 131)
}

/* ---------- constellation: fallback for unknown projects ---------- */

/** Stars on a loose shell, joined by a minimum spanning tree plus a few extra links. */
export function genConstellation(N: number): Float32Array {
  const r0 = rng(57)
  const stars: Vec3[] = []
  while (stars.length < 24) {
    const v = unit(r0)
    const d = 1.6 + r0() * 1.2
    const p: Vec3 = [v[0] * d * 1.2, v[1] * d * 0.85, v[2] * d * 0.8]
    if (stars.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) > 0.9)) stars.push(p)
  }
  const dist = (a: Vec3, b: Vec3): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
  // Prim's MST
  const inTree = new Set<number>([0])
  const links: [number, number][] = []
  while (inTree.size < stars.length) {
    let best: [number, number] = [0, 0]
    let bd = Infinity
    inTree.forEach((i) => stars.forEach((s, j) => {
      if (inTree.has(j)) return
      const d = dist(stars[i], s)
      if (d < bd) { bd = d; best = [i, j] }
    }))
    inTree.add(best[1])
    links.push(best)
  }
  // a few short extra links close loops, so it reads as a constellation, not a tree
  const extra: [number, number, number][] = []
  stars.forEach((a, i) => stars.forEach((b, j) => {
    if (j <= i || links.some((l) => (l[0] === i && l[1] === j) || (l[0] === j && l[1] === i))) return
    extra.push([i, j, dist(a, b)])
  }))
  extra.sort((p, q) => p[2] - q[2]).slice(0, 6).forEach((e) => links.push([e[0], e[1]]))
  const phase = stars.map(() => r0())
  const bright = stars.map(() => 0.55 + r0() * 0.45)
  return build(N, [
    [26, (r, j) => {
      const k = j % stars.length
      const s = stars[k]
      const v = unit(r)
      const d = 0.16 * bright[k] * Math.pow(r(), 1.6)
      return [s[0] + v[0] * d, s[1] + v[1] * d, s[2] + v[2] * d, W(6, phase[k])]
    }],
    [52, (r, j) => {
      const L = links[j % links.length]
      const t = r()
      const a = stars[L[0]]
      const b = stars[L[1]]
      return [lerp(a[0], b[0], t) + jit(r, 0.012), lerp(a[1], b[1], t) + jit(r, 0.012), lerp(a[2], b[2], t) + jit(r, 0.012), W(2, t)]
    }],
    [22, (r) => {
      const v = unit(r)
      const d = 3.1 * Math.pow(r(), 0.5)
      return [v[0] * d * 1.15, v[1] * d * 0.8, v[2] * d * 0.8, 0]
    }],
  ], 0.25, 141)
}
