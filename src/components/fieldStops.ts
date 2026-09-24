/**
 * fieldStops.ts — helpers for marking up sections as particle-field stops
 * (see src/field/contract.ts). Everything here produces plain data-*
 * attributes; the field driver reads them from the DOM.
 */

import type { FieldSide, ShapeId } from '../field/contract'
import type { Project } from '../lib/types'

type Pair = readonly [string, string]

/** Page gradient (top, bottom) per stop, from designs/field.html. */
export const STOP_BG = {
  grid:     ['#0E4148', '#031A1F'],
  clusters: ['#2B1639', '#110A1C'],
  helix:    ['#231B3E', '#0A1321'],
  at:       ['#0B4245', '#031C1E'],
} as const satisfies Record<string, Pair>

/** The design's six project gradients, cycled for projects 7 and up. */
const PROJECT_BG: readonly Pair[] = [
  ['#0B3B3D', '#04181C'],
  ['#0C3447', '#041722'],
  ['#132D50', '#060F22'],
  ['#0D3B37', '#041915'],
  ['#0B3350', '#04121F'],
  ['#103A45', '#051920'],
]

export function projectBg(index: number): Pair {
  const n = PROJECT_BG.length
  return PROJECT_BG[((index % n) + n) % n]
}

export function projectStopKey(p: Pick<Project, 'slug'>): string {
  return `project:${p.slug}`
}

export interface StopOptions {
  key: string
  shape: ShapeId
  side: FieldSide
  bg: Pair
  tint?: readonly string[]
  clusterSizes?: readonly number[]
  rings?: number
}

export type StopAttrs = Record<`data-${string}`, string>

/** data-* attributes that turn an element into a field stop. */
export function stopAttrs(o: StopOptions): StopAttrs {
  const attrs: StopAttrs = {
    'data-field-stop': o.key,
    'data-shape': o.shape,
    'data-side': o.side,
    'data-bg': o.bg.join(','),
  }
  if (o.tint && o.tint.length) attrs['data-tint'] = o.tint.join(',')
  if (o.clusterSizes && o.clusterSizes.length) attrs['data-cluster-sizes'] = o.clusterSizes.join(',')
  if (o.rings != null) attrs['data-rings'] = String(o.rings)
  return attrs
}

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']

/** 3 → "three", 14 → "14". */
export function numberWord(n: number): string {
  return WORDS[n] ?? String(n)
}

export function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
