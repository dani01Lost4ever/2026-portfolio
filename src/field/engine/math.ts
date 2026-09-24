/**
 * Small numeric helpers shared by the shape generators and the driver.
 * Everything here is pure: no DOM, no three.js.
 */

export const TAU = Math.PI * 2

export type Vec3 = [number, number, number]
export type Vec4 = [number, number, number, number]
export type RGB = [number, number, number]
/** Seeded random source in [0, 1). */
export type Rand = () => number

/** mulberry32: tiny, fast, deterministic. */
export function rng(seed: number): Rand {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v)
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
export function smooth(a: number, b: number, x: number): number {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
export const power2InOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
export const power3Out = (t: number): number => 1 - Math.pow(1 - t, 4)
export const easeInOutCubic = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** Groups are packed in steps of 16 so there is room for 16 per-point behaviour flags. */
export const GROUP_STRIDE = 16

/**
 * Pack a point's behaviour into its 4th component: group * 16 + flag + phase.
 * The vertex shader unpacks it (see shaders.ts for the flag table).
 */
export function W(flag: number, phase: number, group = 0): number {
  return group * GROUP_STRIDE + flag + clamp(phase, 0, 1) * 0.98
}

/** Uniform random unit vector. */
export function unit(r: Rand): Vec3 {
  const u = r() * 2 - 1
  const a = r() * TAU
  const s = Math.sqrt(1 - u * u)
  return [s * Math.cos(a), u, s * Math.sin(a)]
}

export const jit = (r: Rand, s: number): number => (r() - 0.5) * 2 * s

export function hexToRgb(h: string): RGB {
  let s = h.trim().replace('#', '')
  if (s.length === 3 || s.length === 4) s = s.slice(0, 3).split('').map((c) => c + c).join('')
  const n = parseInt(s.slice(0, 6), 16)
  if (!Number.isFinite(n)) return [0, 0, 0]
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

export function rgbToHex(c: RGB): string {
  return '#' + c.map((v) => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, '0')).join('')
}

/** Point on segment a→b plus jitter. */
export function seg(r: Rand, a: Vec3, b: Vec3, th: number): Vec3 {
  const t = r()
  return [lerp(a[0], b[0], t) + jit(r, th), lerp(a[1], b[1], t) + jit(r, th), lerp(a[2], b[2], t) + jit(r, th)]
}

/** Point on a quadratic bezier in the xy plane plus jitter. */
export function bez(r: Rand, a: Vec3, c: Vec3, b: Vec3, th: number): Vec3 {
  const t = r()
  const u = 1 - t
  return [
    u * u * a[0] + 2 * u * t * c[0] + t * t * b[0] + jit(r, th),
    u * u * a[1] + 2 * u * t * c[1] + t * t * b[1] + jit(r, th),
    jit(r, th),
  ]
}

/** Point on an ellipsoid surface. */
export function ell(r: Rand, c: Vec3, rad: Vec3): Vec3 {
  const v = unit(r)
  return [c[0] + v[0] * rad[0], c[1] + v[1] * rad[1], c[2] + v[2] * rad[2]]
}

/** Hilbert curve index of (x, y) on an n×n grid (n a power of two). */
export function xy2d(n: number, x: number, y: number): number {
  let d = 0
  for (let s = n >> 1; s > 0; s >>= 1) {
    const rx = (x & s) > 0 ? 1 : 0
    const ry = (y & s) > 0 ? 1 : 0
    d += s * s * ((3 * rx) ^ ry)
    if (ry === 0) {
      if (rx === 1) {
        x = n - 1 - x
        y = n - 1 - y
      }
      const t = x
      x = y
      y = t
    }
  }
  return d
}

/**
 * Order points along a Hilbert curve (in screen-ish space) so index i lands in a similar
 * region in every shape: morphs read as a coherent flow instead of an explosion.
 */
export function hilbertSort(buf: Float32Array, n: number, tilt: number): Float32Array {
  const c = Math.cos(tilt)
  const s = Math.sin(tilt)
  const keys = new Float64Array(n)
  const order = new Uint32Array(n)
  for (let i = 0; i < n; i++) {
    const x = buf[i * 4]
    const y = buf[i * 4 + 1]
    const z = buf[i * 4 + 2]
    const sy = c * y - s * z
    const hx = clamp(Math.round(((x + 9) / 18) * 1023), 0, 1023)
    const hy = clamp(Math.round(((sy + 9) / 18) * 1023), 0, 1023)
    keys[i] = xy2d(1024, hx, hy)
    order[i] = i
  }
  order.sort((a, b) => keys[a] - keys[b])
  const out = new Float32Array(n * 4)
  for (let i = 0; i < n; i++) out.set(buf.subarray(order[i] * 4, order[i] * 4 + 4), i * 4)
  return out
}

/** A part of a shape: relative weight + a sampler for the j-th of its n points. */
export type Part = [weight: number, sample: (r: Rand, j: number, n: number) => Vec4 | number[]]

/** Fill a fixed-length buffer of N points from weighted parts, then Hilbert-order it. */
export function build(N: number, parts: Part[], tilt: number, seed: number): Float32Array {
  const r = rng(seed)
  const buf = new Float32Array(N * 4)
  let tw = 0
  for (const p of parts) tw += p[0]
  let i = 0
  parts.forEach((p, pi) => {
    const n = pi === parts.length - 1 ? N - i : Math.round((N * p[0]) / tw)
    for (let j = 0; j < n && i < N; j++, i++) buf.set(p[1](r, j, n), i * 4)
  })
  return hilbertSort(buf, N, tilt)
}
