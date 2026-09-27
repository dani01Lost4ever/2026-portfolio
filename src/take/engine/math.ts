/**
 * math.ts — the film's clock maths. Everything the film draws is a pure function of t
 * (in beats); these helpers keep it that way.
 */

export const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x)
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
export const eio = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)
export const smooth = (p: number) => p * p * (3 - 2 * p)

/** Seconds per beat: the film is cut at 120 BPM. */
export const SPB = 0.5

/** Closed-form spring step response: 0 before tau = 0, settles at 1. `resp` is Apple's response in seconds. */
export function stepResp(tau: number, resp: number, damp: number): number {
  if (tau <= 0) return 0
  const w = (2 * Math.PI) / resp
  if (damp >= 1) {
    const x = w * tau
    return 1 - Math.exp(-x) * (1 + x)
  }
  const wd = w * Math.sqrt(1 - damp * damp)
  return 1 - Math.exp(-damp * w * tau) * (Math.cos(wd * tau) + ((damp * w) / wd) * Math.sin(wd * tau))
}

export interface Spring { r: number; d: number }

export const SP = {
  text: { r: 0.5, d: 0.86 }, snap: { r: 0.36, d: 0.82 }, pop: { r: 0.4, d: 0.6 }, fast: { r: 0.28, d: 1 },
  soft: { r: 0.6, d: 1 }, cam: { r: 0.8, d: 1 }, liq: { r: 0.55, d: 0.62 }, close: { r: 0.3, d: 1 },
  bento: { r: 0.55, d: 0.85 }, unfold: { r: 0.45, d: 0.85 }, move: { r: 0.45, d: 1 }, fly: { r: 0.6, d: 0.9 },
  win: { r: 0.5, d: 0.85 }, roll: { r: 0.55, d: 0.95 }, lift: { r: 0.6, d: 0.85 }, squeeze: { r: 0.55, d: 0.9 },
} satisfies Record<string, Spring>

/** A spring that starts at beat t0, sampled at beat t. */
export const spr = (t: number, t0: number, o: Spring = SP.snap) => stepResp((t - t0) * SPB, o.r, o.d)

/** A spring on real time (ms timestamps), for the parts of the site that sit outside the film clock. */
export const sprMs = (now: number, t0: number, r: number, d: number) => stepResp((now - t0) / 1000, r, d)

export type Key = [beat: number, value: number, spring?: Spring]

/** A value with many targets: its start plus one spring per change, so it stays a function of t. */
export function track(t: number, v0: number, keys: readonly Key[], o: Spring = SP.snap): number {
  let v = v0
  let prev = v0
  for (const k of keys) {
    v += (k[1] - prev) * spr(t, k[0], k[2] ?? o)
    prev = k[1]
  }
  return v
}

export interface Rect { x: number; y: number; w: number; h: number }

export const lerpR = (a: Rect, b: Rect, p: number): Rect => ({
  x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), w: lerp(a.w, b.w, p), h: lerp(a.h, b.h, p),
})
