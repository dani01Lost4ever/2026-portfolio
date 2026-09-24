/**
 * Shapes ported unchanged from designs/field.html v3 (local units, radius ~3).
 * Each returns a Hilbert-ordered Float32Array of N points (x, y, z, packed behaviour).
 */
import { CLOCK_PITCH } from '../shaders'
import { TAU, W, bez, build, clamp, ell, jit, lerp, rng, seg, unit, type Part, type Vec3 } from '../math'

export function genGrid(N: number): Float32Array {
  const cols = Math.round(Math.sqrt(N * 1.6))
  const rows = Math.ceil(N / cols)
  return build(N, [[1, (_r, j) => {
    const cx = j % cols
    const cz = Math.floor(j / cols)
    const x = -11 + (22 * cx) / (cols - 1)
    const z = -7 + (14 * cz) / Math.max(rows - 1, 1)
    const line = cx % 8 === 0 || cz % 6 === 0 ? 0.8 : 0.2
    return [x, 0, z, W(4, line)]
  }]], 0.42, 3)
}

export function genBug(N: number): Float32Array {
  const legs: [number, number][][] = [
    [[0.62, 1.25], [1.55, 1.9], [2.2, 2.65]],
    [[0.72, 0.9], [1.8, 0.95], [2.5, 0.7]],
    [[0.8, 0.3], [1.65, -0.25], [2.15, -1.35]],
  ]
  const off = -0.55
  const sh = (p: Vec3, fl: number): number[] => [p[0], p[1] + off, p[2], fl]
  return build(N, [
    [30, (r) => sh(ell(r, [0, -0.55, 0], [1.05, 1.5, 0.6]), 0)],
    [3, (r) => {
      const y = -2.0 + r() * 2.85
      const k = (y + 0.55) / 1.5
      return sh([jit(r, 0.025), y, 0.6 * Math.sqrt(Math.max(0, 1 - k * k)) + 0.02], W(1, 0))
    }],
    [8, (r) => sh(ell(r, [0, 1.2, 0], [0.72, 0.48, 0.45]), 0)],
    [5, (r) => sh(ell(r, [0, 1.95, 0], [0.44, 0.36, 0.34]), 0)],
    [1.5, (r, j) => {
      const s = j % 2 ? 1 : -1
      const v = unit(r)
      return sh([0.24 * s + v[0] * 0.07, 2.08 + v[1] * 0.07, 0.28 + v[2] * 0.07], W(1, 0))
    }],
    [16, (r, j) => {
      const L = j % 6
      const s = L < 3 ? -1 : 1
      const g = legs[L % 3]
      const t = r()
      const a: Vec3 = [g[0][0] * s, g[0][1], -0.1]
      const k: Vec3 = [g[1][0] * s, g[1][1], -0.15]
      const f: Vec3 = [g[2][0] * s, g[2][1], -0.2]
      const p = t < 0.45 ? seg(r, a, k, 0.035) : seg(r, k, f, 0.03)
      return sh(p, 0)
    }],
    [5, (r, j) => {
      const s = j % 2 ? 1 : -1
      return sh(bez(r, [0.14 * s, 2.25, 0], [0.35 * s, 3.0, 0], [1.0 * s, 3.15, 0], 0.025), 0)
    }],
    [23, (r) => {
      let a: number
      do { a = r() * TAU } while (Math.abs(Math.sin(2 * a)) < 0.12)
      const rad = 3.05 + jit(r, 0.02)
      return [Math.cos(a) * rad, Math.sin(a) * rad, jit(r, 0.02), W(2, a / TAU)]
    }],
    [6, (r, j) => {
      const a = ((j % 4) * TAU) / 4
      const rad = 2.6 + r() * 0.85
      return [Math.cos(a) * rad + jit(r, 0.02), Math.sin(a) * rad + jit(r, 0.02), 0, W(1, 0)]
    }],
    [2.5, (r) => {
      const v = unit(r)
      return [v[0] * 0.09, v[1] * 0.09, v[2] * 0.09 + 0.8, W(1, 0)]
    }],
  ], 0.12, 11)
}

export function genTorus(N: number): Float32Array {
  const R = 2.2
  const rr = 0.62
  return build(N, [
    [76, (r) => {
      let u: number, v: number
      do { u = r() * TAU; v = r() * TAU } while (r() > (R + rr * Math.cos(v)) / (R + rr))
      return [(R + rr * Math.cos(v)) * Math.cos(u), rr * Math.sin(v), (R + rr * Math.cos(v)) * Math.sin(u), 0]
    }],
    [12, (r) => {
      const u = r() * TAU
      const rad = R + rr + 0.02
      return [rad * Math.cos(u), jit(r, 0.05), rad * Math.sin(u), W(2, u / TAU)]
    }],
    [12, (r) => {
      const u = r() * TAU
      const rad = 3.25 + jit(r, 0.02)
      return [rad * Math.cos(u), jit(r, 0.02), rad * Math.sin(u), W(2, ((u / TAU) * 2) % 1)]
    }],
  ], 1.1, 21)
}

export function genPlanet(N: number): Float32Array {
  const clumps: number[] = []
  const r0 = rng(5)
  for (let k = 0; k < 9; k++) clumps.push((k * TAU) / 9 + r0() * 0.3)
  return build(N, [
    [58, (r) => {
      let v: Vec3
      do { v = unit(r) } while (r() > 0.3 + 0.7 * Math.pow(Math.sin(v[1] * 7 + 0.6), 2))
      return [v[0] * 1.6, v[1] * 1.6, v[2] * 1.6, 0]
    }],
    [28, (r) => {
      const a = r() * TAU
      let rad = 2.15 + Math.pow(r(), 0.8) * 0.85
      if (rad > 2.55 && rad < 2.62) rad += 0.08
      return [Math.cos(a) * rad, jit(r, 0.035), Math.sin(a) * rad, W(3, r() * 0.8)]
    }],
    [14, (r, j) => {
      const a = clumps[j % 9] + jit(r, 0.05) - r() * r() * 0.35
      const rad = 3.35 + jit(r, 0.06)
      return [Math.cos(a) * rad, jit(r, 0.06), Math.sin(a) * rad, W(3, 0.95)]
    }],
  ], 0.36, 31)
}

export function genRibbon(N: number): Float32Array {
  const r0 = rng(77)
  const M = 22
  const cs: { o: number; c: number; h: number; l: number }[] = []
  let price = 0
  let lo = 1e9
  let hi = -1e9
  for (let k = 0; k < M; k++) {
    const o = price
    const c = o + 0.17 + (r0() - 0.45) * 0.62
    const h = Math.max(o, c) + r0() * 0.22
    const l = Math.min(o, c) - r0() * 0.22
    cs.push({ o, c, h, l })
    price = c
    lo = Math.min(lo, l)
    hi = Math.max(hi, h)
  }
  const Y = (v: number): number => -2.1 + ((v - lo) / (hi - lo)) * 4.1
  const X = (k: number): number => -3.3 + (6.6 * k) / (M - 1)
  const curve = (s: number): number => {
    const u = s * (M - 1)
    const i = Math.min(Math.floor(u), M - 2)
    const t = u - i
    const p0 = cs[Math.max(i - 1, 0)].c
    const p1 = cs[i].c
    const p2 = cs[i + 1].c
    const p3 = cs[Math.min(i + 2, M - 1)].c
    const v = 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t)
    return Y(v)
  }
  return build(N, [
    [36, (r) => {
      const k = Math.floor(r() * M)
      const q = cs[k]
      const a = Y(Math.min(q.o, q.c))
      const b = Math.max(Y(Math.max(q.o, q.c)), a + 0.08)
      return [X(k) + jit(r, 0.09), lerp(a, b, r()), jit(r, 0.09), W(7, (q.c >= q.o ? 0.5 : 0) + (k / M) * 0.49)]
    }],
    [10, (r) => {
      const k = Math.floor(r() * M)
      const q = cs[k]
      return [X(k) + jit(r, 1.2e-2), lerp(Y(q.l), Y(q.h), r()), 0, 0]
    }],
    [44, (r) => {
      const s = r()
      return [-3.3 + 6.6 * s, curve(s) + 0.45 + jit(r, 0.02), -0.3 - r() * 0.9, W(2, s)]
    }],
    [10, (r) => {
      let x = -3.6 + r() * 7.2
      let z = -1.5 + r() * 2.2
      if (r() < 0.5) x = Math.round(x * 2) / 2
      else z = Math.round(z * 2) / 2
      return [x, -2.55, z, 0]
    }],
  ], 0.2, 41)
}

export function genGlobe(N: number): Float32Array {
  // an unmistakable globe: graticule (8 meridians, 5 parallels) + thin sparse shell + bright DNS-update arcs
  const R = 2.2
  const r0 = rng(9)
  const ends: Vec3[] = []
  const land = (v: Vec3): number =>
    Math.sin(3.1 * v[0] + 0.3) * Math.cos(2.3 * v[1] - 0.4) +
    0.6 * Math.sin(2.7 * v[2] + 1.1) * Math.cos(3.7 * v[0] + 0.2) +
    0.3 * Math.sin(5.3 * v[1] + 2 * v[2])
  while (ends.length < 12) {
    const v0 = unit(r0)
    if (land(v0) > 0.35 && Math.abs(v0[1]) < 0.8) ends.push(v0)
  }
  const slerp = (a: Vec3, b: Vec3, t: number): Vec3 => {
    const d = clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1)
    const om = Math.acos(d)
    const so = Math.sin(om) || 1e-4
    const s1 = Math.sin((1 - t) * om) / so
    const s2 = Math.sin(t * om) / so
    return [a[0] * s1 + b[0] * s2, a[1] * s1 + b[1] * s2, a[2] * s1 + b[2] * s2]
  }
  const sph = (lat: number, lon: number, rad: number): number[] => [
    Math.cos(lat) * Math.cos(lon) * rad, Math.sin(lat) * rad, Math.cos(lat) * Math.sin(lon) * rad,
  ]
  return build(N, [
    [30, (r) => {
      const lon = (Math.floor(r() * 8) * Math.PI) / 8
      const lat = (r() * 2 - 1) * (Math.PI / 2)
      const p = sph(lat, lon, R + jit(r, 1.2e-2))
      p.push(0)
      return p
    }],
    [24, (r) => {
      const lat = ((Math.floor(r() * 5) - 2) * Math.PI) / 6.5
      const lon = r() * TAU
      const p = sph(lat, lon, R + jit(r, 1.2e-2))
      p.push(0)
      return p
    }],
    [8, (r) => {
      const lon = r() * TAU
      const rad = R + jit(r, 1.2e-2)
      return [Math.cos(lon) * rad, jit(r, 2e-2), Math.sin(lon) * rad, 0]
    }],
    [12, (r) => {
      const v = unit(r)
      return [v[0] * R, v[1] * R, v[2] * R, 0]
    }],
    [8, (r) => {
      let v: Vec3
      do { v = unit(r) } while (land(v) < 0.45)
      return [v[0] * R, v[1] * R, v[2] * R, 0]
    }],
    [14, (r, j) => {
      const k = j % 6
      const s = r()
      const p = slerp(ends[k * 2], ends[k * 2 + 1], s)
      const h = R * (1 + 0.24 * Math.sin(Math.PI * s))
      return [p[0] * h + jit(r, 1.5e-2), p[1] * h + jit(r, 1.5e-2), p[2] * h + jit(r, 1.5e-2), W(6, (s * 0.7 + k * 0.29) % 1)]
    }],
    [4, (r, j) => {
      const e = ends[j % 12]
      const v = unit(r)
      return [e[0] * R * 1.02 + v[0] * 0.07, e[1] * R * 1.02 + v[1] * 0.07, e[2] * R * 1.02 + v[2] * 0.07, W(1, 0)]
    }],
  ], 0.38, 51)
}

export function genClocks(N: number): Float32Array {
  const P = CLOCK_PITCH
  const r0 = rng(13)
  const cells: { x: number; y: number; h: number; m: number }[] = []
  for (let k = 0; k < 12; k++) cells.push({ x: ((k % 4) - 1.5) * P, y: (1 - Math.floor(k / 4)) * P, h: r0() * TAU, m: r0() * TAU })
  return build(N, [
    [46, (r, j) => {
      const c = cells[j % 12]
      const a = r() * TAU
      const rad = 0.58 + jit(r, 1.5e-2)
      return [c.x + Math.cos(a) * rad, c.y + Math.sin(a) * rad, jit(r, 0.03), W(2, (j % 12) / 12)]
    }],
    [12, (r, j) => {
      const c = cells[j % 12]
      const a = (Math.floor(r() * 12) * TAU) / 12
      const rad = lerp(0.43, 0.51, r())
      return [c.x + Math.cos(a) * rad, c.y + Math.sin(a) * rad, 0, 0]
    }],
    [20, (r, j) => {
      const c = cells[j % 12]
      const t = r() * 0.46
      return [c.x + Math.cos(c.m) * t, c.y + Math.sin(c.m) * t, jit(r, 1.5e-2), W(5, 0.9)]
    }],
    [14, (r, j) => {
      const c = cells[j % 12]
      const t = r() * 0.3
      return [c.x + Math.cos(c.h) * t, c.y + Math.sin(c.h) * t, jit(r, 0.02), W(5, 0.1)]
    }],
    [8, (r, j) => {
      const c = cells[j % 12]
      const v = unit(r)
      return [c.x + v[0] * 0.06, c.y + v[1] * 0.06, v[2] * 0.06, W(1, 0)]
    }],
  ], -0.25, 61)
}

/** One cluster per skill group, in world units, sized by skill count. */
export interface ClusterSpot {
  x: number
  y: number
  rad: number
  count: number
}

// DOM driven: clusters sit in the spot boxes next to their labels
export function genClusters(N: number, spots: ClusterSpot[]): Float32Array {
  if (!spots.length) return genConstellationLike(N)
  let total = 0
  for (const s of spots) total += Math.max(1, s.count)
  const r0 = rng(17)
  const knots = spots.map((s) => {
    const out: Vec3[] = []
    for (let k = 0; k < Math.max(1, s.count); k++) {
      const v = unit(r0)
      const d = s.rad * 0.55 * Math.cbrt(r0())
      out.push([s.x + v[0] * d, s.y + v[1] * d, v[2] * d])
    }
    return out
  })
  let gapY = 0
  for (const s of spots) gapY += s.y / spots.length
  // links avoid the labels: vertical runs inside the spot column, cross-links bow through the row gap.
  // Each spot links to its nearest neighbour to the right in its row and below in its column.
  const links: [number, number][] = []
  spots.forEach((a, ai) => {
    let right = -1
    let below = -1
    spots.forEach((b, bi) => {
      if (bi === ai) return
      if (Math.abs(b.y - a.y) < 0.5 && b.x > a.x + 0.5 && (right < 0 || b.x < spots[right].x)) right = bi
      if (Math.abs(b.x - a.x) < 0.5 && b.y < a.y - 0.1 && (below < 0 || b.y > spots[below].y)) below = bi
    })
    if (below >= 0) links.push([below, ai])
    if (right >= 0) links.push([ai, right])
  })
  const parts: Part[] = spots.map((s, si) => [
    (88 * Math.max(1, s.count)) / total,
    (r) => {
      if (r() < 0.4) {
        const kn = knots[si]
        const kc = kn[Math.floor(r() * kn.length)]
        const v = unit(r)
        const d = 0.13 * Math.cbrt(r())
        return [kc[0] + v[0] * d, kc[1] + v[1] * d, kc[2] + v[2] * d, W(1, 0, si + 1)]
      }
      const u = unit(r)
      const dd = s.rad * Math.pow(r(), 0.55)
      return [s.x + u[0] * dd, s.y + u[1] * dd, u[2] * dd, W(0, 0, si + 1)]
    },
  ])
  if (links.length) {
    parts.push([12, (r, j) => {
      const L = links[j % links.length]
      const a = spots[L[0]]
      const b = spots[L[1]]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const len = Math.hypot(dx, dy) || 1
      const s0 = (a.rad / len) * 0.9
      const s1 = 1 - (b.rad / len) * 0.9
      const s = lerp(s0, s1, r())
      const u = 1 - s
      const cxp = (a.x + b.x) / 2
      const cyp = Math.abs(dx) < 0.5 ? (a.y + b.y) / 2 : 2 * gapY - (a.y + b.y) / 2
      const x = u * u * a.x + 2 * u * s * cxp + s * s * b.x
      const y = u * u * a.y + 2 * u * s * cyp + s * s * b.y
      return [x + jit(r, 0.03), y + jit(r, 0.03), Math.sin(Math.PI * s) * 0.3 + jit(r, 0.03), W(2, s)]
    }])
  }
  return build(N, parts, 0, 71)
}

/** Stand-in used only when a clusters stop has nothing to measure. */
function genConstellationLike(N: number): Float32Array {
  return build(N, [[1, (r) => {
    const v = unit(r)
    const d = 2.4 * Math.pow(r(), 0.55)
    return [v[0] * d, v[1] * d, v[2] * d, 0]
  }]], 0, 72)
}

export interface HelixCfg {
  markers: number[]
  yMin: number
  yMax: number
  R: number
  ringR: number
  tilt: number
}

export function genHelix(N: number, cfg: HelixCfg): Float32Array {
  const H = cfg.yMax - cfg.yMin
  const turns = H / 2.3
  const R = cfg.R
  const M = Math.max(1, cfg.markers.length)
  const markers = cfg.markers.length ? cfg.markers : [0]
  const at = (s: number, off: number, rad: number): Vec3 => {
    const th = s * turns * TAU + off
    return [rad * Math.cos(th), cfg.yMin + s * H, rad * Math.sin(th)]
  }
  return build(N, [
    [46, (r) => {
      const s = r()
      const p = at(s, 0, R)
      return [p[0] + jit(r, 0.06), p[1] + jit(r, 0.06), p[2] + jit(r, 0.06), W(2, (s * 3) % 1)]
    }],
    [14, (r) => {
      const s = r()
      const p = at(s, Math.PI, R * 0.9)
      return [p[0] + jit(r, 0.04), p[1], p[2] + jit(r, 0.04), 0]
    }],
    [28, (r, j) => {
      const y = markers[j % M]
      const a = r() * TAU
      const rad = cfg.ringR + jit(r, 0.03)
      return [Math.cos(a) * rad, y + jit(r, 0.02), Math.sin(a) * rad, W(1, 0, (j % M) + 1)]
    }],
    [12, (r, j) => {
      const y = markers[j % M]
      const p = at((y - cfg.yMin) / H, 0, R)
      const v = unit(r)
      return [p[0] + v[0] * 0.15, p[1] + v[1] * 0.15, p[2] + v[2] * 0.15, W(1, 0, (j % M) + 1)]
    }],
  ], cfg.tilt, 81)
}

/** "@" sampled from Manrope 700 (falls back to the torus if the glyph can't be rasterised). */
export function genAt(N: number): Float32Array {
  const S = 360
  let d: Uint8ClampedArray | null = null
  try {
    const cv = document.createElement('canvas')
    cv.width = cv.height = S
    const cx = cv.getContext('2d', { willReadFrequently: true })
    if (cx) {
      cx.fillStyle = '#fff'
      cx.textAlign = 'center'
      cx.textBaseline = 'middle'
      cx.font = '700 330px Manrope, system-ui, sans-serif'
      cx.fillText('@', S / 2, S / 2 + 10)
      d = cx.getImageData(0, 0, S, S).data
    }
  } catch {
    d = null
  }
  if (!d) return genTorus(N)
  const data = d
  const fill: number[] = []
  const edge: number[] = []
  let minX = S, maxX = 0, minY = S, maxY = 0
  const on = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < S && y < S && data[(y * S + x) * 4 + 3] > 128
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (!on(x, y)) continue
      fill.push(x, y)
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
      if (!on(x + 2, y) || !on(x - 2, y) || !on(x, y + 2) || !on(x, y - 2)) edge.push(x, y)
    }
  }
  if (fill.length < 200) return genTorus(N)
  const cxm = (minX + maxX) / 2
  const cym = (minY + maxY) / 2
  const sc = 5.4 / Math.max(maxX - minX, maxY - minY)
  let rMax = 1
  for (let q = 0; q < fill.length; q += 2) rMax = Math.max(rMax, Math.hypot(fill[q] - cxm, fill[q + 1] - cym))
  const pick = (list: number[], r: () => number): [number, number] => {
    let k: number
    let tries = 0
    do {
      k = Math.floor((r() * list.length) / 2) * 2
      tries++
    } while (tries < 6 && r() > 0.45 + (0.55 * Math.hypot(list[k] - cxm, list[k + 1] - cym)) / rMax)
    return [(list[k] - cxm + jit(r, 0.6)) * sc, -(list[k + 1] - cym + jit(r, 0.6)) * sc]
  }
  return build(N, [
    [72, (r) => {
      const p = pick(fill, r)
      return [p[0], p[1], jit(r, 0.28), 0]
    }],
    [28, (r) => {
      const p = pick(edge, r)
      return [p[0], p[1], jit(r, 0.12), W(2, Math.atan2(p[1], p[0]) / TAU + 0.5)]
    }],
  ], 0, 91)
}
