/**
 * Shape registry, keyed by ShapeId. Every generator fills the same fixed-length, Hilbert-ordered
 * buffer of N points, so any stop can morph into any other.
 *
 * Per-shape motion/layout parameters come straight from designs/field.html v3:
 *   xf    [spin speed, wobble amplitude, x tilt] applied in the vertex shader
 *   rotW  how strongly drag-rotation applies [yaw, pitch]
 *   lock  how much the cloud scrolls with the page (0 fixed, 1 glued to its DOM box)
 *   push  pointer repulsion strength
 */
import type { ShapeId } from '../../contract'
import type { Vec3 } from '../math'
import { genAt, genBug, genClocks, genGlobe, genGrid, genPlanet, genRibbon, genTorus } from './classic'
import { genBattleship, genBrowser, genCoins, genConstellation, genTicTacToe } from './projects'

export { genClusters, genHelix } from './classic'
export type { ClusterSpot, HelixCfg } from './classic'

/** How a stop is placed on screen. */
export type LayoutKind = 'hero' | 'side' | 'at' | 'helix' | 'clusters'

export interface ShapeDef {
  layout: LayoutKind
  xf: Vec3
  rotW: [number, number]
  lock: number
  push: number
  alpha: number
  /** Default page gradient (top, bottom) when the stop has no data-bg. */
  bg: [string, string]
  /** Generator for shapes that don't depend on the page layout (clusters/helix are built from measurements). */
  gen?: (N: number) => Float32Array
  /** Output depends on web fonts: regenerate once fonts have loaded. */
  fontDependent?: boolean
}

const project = (gen: (N: number) => Float32Array, xf: Vec3, bg: [string, string]): ShapeDef => ({
  layout: 'side', xf, rotW: [1, 1], lock: 0.22, push: 1, alpha: 1, bg, gen,
})

export const SHAPES: Record<ShapeId, ShapeDef> = {
  grid: { layout: 'hero', xf: [0, 0, 0.42], rotW: [0.6, 0.25], lock: 0, push: 1, alpha: 1.15, bg: ['#0E4148', '#031A1F'], gen: genGrid },
  bug: project(genBug, [0, 0.32, 0.12], ['#0B3B3D', '#04181C']),
  loop: project(genTorus, [0.25, 0, 1.1], ['#0C3447', '#041722']),
  orbit: project(genPlanet, [0.08, 0, 0.36], ['#132D50', '#060F22']),
  candles: project(genRibbon, [0, 0.45, 0.2], ['#0D3B37', '#041915']),
  globe: project(genGlobe, [0.22, 0, 0.38], ['#0B3350', '#04121F']),
  clocks: project(genClocks, [0, 0.28, -0.25], ['#103A45', '#051920']),
  coins: project(genCoins, [0, 0.3, 0.34], ['#0B3A42', '#04171C']),
  browser: project(genBrowser, [0, 0.3, 0.06], ['#2A2438', '#0F0C18']),
  tictactoe: project(genTicTacToe, [0, 0.32, 0.1], ['#2B1A3E', '#0E0A1C']),
  battleship: project(genBattleship, [0, 0.22, 0.62], ['#0B2A48', '#040F1E']),
  constellation: project(genConstellation, [0.12, 0, 0.25], ['#10324A', '#05121E']),
  clusters: { layout: 'clusters', xf: [0, 0, 0], rotW: [0, 0], lock: 1, push: 0.8, alpha: 1, bg: ['#2B1639', '#110A1C'] },
  helix: { layout: 'helix', xf: [0.2, 0, 0.1], rotW: [1, 0.15], lock: 0, push: 0.8, alpha: 1, bg: ['#231B3E', '#0A1321'] },
  at: { layout: 'at', xf: [0, 0.3, 0], rotW: [1, 0.8], lock: 0, push: 1.3, alpha: 1, bg: ['#0B4245', '#031C1E'], gen: genAt, fontDependent: true },
}

export function isShapeId(s: string | null | undefined): s is ShapeId {
  return !!s && Object.prototype.hasOwnProperty.call(SHAPES, s)
}

/** Unknown or missing shapes fall back to the constellation. */
export function resolveShape(s: string | null | undefined): ShapeId {
  return isShapeId(s) ? s : 'constellation'
}

/**
 * Visual half-extents (x, y) of a shape including its spin/wobble/tilt, used to size it to its slot.
 */
export function extent(buf: Float32Array, xf: Vec3): [number, number] {
  let ex = 0
  let ey = 0
  const c = Math.abs(Math.cos(xf[2]))
  const sn = Math.abs(Math.sin(xf[2]))
  const spin = xf[0] > 0
  const w = Math.min(xf[1], 1.2)
  const n = buf.length / 4
  for (let q = 0; q < n; q++) {
    const x = Math.abs(buf[q * 4])
    const y = Math.abs(buf[q * 4 + 1])
    const z = Math.abs(buf[q * 4 + 2])
    const rad = Math.hypot(x, z)
    const hx = spin ? rad : x * Math.cos(w) + z * Math.sin(w)
    const rz = spin ? rad : z + x * Math.sin(w)
    ex = Math.max(ex, hx)
    ey = Math.max(ey, c * y + sn * rz)
  }
  return [ex, ey]
}
