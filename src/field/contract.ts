/**
 * contract.ts — the seam between the page (React sections) and the particle field.
 *
 * The page never talks to three.js directly. It marks up sections with data
 * attributes; the field driver reads them, measures them, and scrubs the point
 * cloud from one stop to the next as the page scrolls.
 *
 * ── Stops ────────────────────────────────────────────────────────────────────
 * Any element with `data-field-stop` is a stop, in document order:
 *
 *   <section
 *     data-field-stop="project:bugpilot"   // unique key
 *     data-shape="bug"                     // a ShapeId
 *     data-side="right"                    // where the cloud sits (opposite the text)
 *     data-tint="#dc2626,#7c3aed"          // optional: top,bottom colours
 *     data-cluster-sizes="5,4,3,5"         // optional: 'clusters' stop only
 *     data-rings="6"                       // optional: 'helix' stop only
 *     data-bg="#0E4148,#031A1F"            // optional: page gradient top,bottom for this stop
 *   >
 *
 * The driver interpolates data-bg between stops and writes it to
 * `--field-bg-a` / `--field-bg-b` on <html>; the page's CSS paints the body
 * gradient from those two variables.
 *
 * Side stops (project panels) on desktop:
 *   <div data-field-text>                   // the text column; the shape is centred in the space beside it
 * and the driver writes the shape's rest box on the stop element as
 * `--shape-cx` / `--shape-bottom` (viewport px) so the page can place a caption under it.
 *
 * The driver maps scroll to a continuous progress p in [0, stops.length - 1]:
 * p is an integer while a stop's anchor is centred in the viewport and
 * fractional while travelling between stops.
 *
 * ── Hover coupling ───────────────────────────────────────────────────────────
 *   data-field-hover="project:bugpilot"    // hovering/focusing pulses that stop's shape
 *   data-field-cluster="1"                 // hovering lights cluster 1 of the current clusters stop
 *   data-field-ring="2"                    // hovering lights ring 2 of the current helix stop
 *
 * Elements matching FIELD_NO_DRAG (text, links, controls, the tech cube) never
 * start a field drag-rotate or shockwave.
 */

export type ShapeId =
  | 'grid'         // hero: breathing data terrain
  | 'bug'          // BugPilot: bug in a reticle
  | 'loop'         // The Loop: torus with a travelling pulse
  | 'orbit'        // Stellar Freight Co.: planet with orbiting drone swarms
  | 'candles'      // AuroraTrader: rising candlesticks + price ribbon
  | 'globe'        // Cloudflare DDNS: graticule globe with DNS-update arcs
  | 'clocks'       // Agendash 3: grid of ticking clocks
  | 'coins'        // OpenAI Cost Calculator: coin stacks as a per-model cost bar chart
  | 'browser'      // Original Portfolio: browser window wireframe with a particles.js constellation inside
  | 'tictactoe'    // Tic-Tac-Toe vs AI: 3×3 board with X/O and a minimax tree fanning below
  | 'battleship'   // Battleship vs AI: 10×10 grid plane, ship silhouettes, hunt/target ripple
  | 'clusters'     // About: one cluster per skill category, sized by skill count
  | 'helix'        // Experience: rising helix, one bright ring per role/school
  | 'at'           // Contact: "@" sampled from Manrope 700
  | 'constellation' // fallback for projects with no known shape

export type FieldSide = 'left' | 'right' | 'center' | 'top'

/** Selector for elements that must not start a field drag or shockwave. */
export const FIELD_NO_DRAG =
  'a, button, input, textarea, select, label, [role="button"], [contenteditable], nav, .tc-root, [data-no-field-drag], h1, h2, h3, h4, p, li, dd, dt'

/** One layer of a project's tech cube (4 per project, top to bottom). */
export interface CubeLayer {
  label: string   // small caption, e.g. "Client"
  tech: string    // the big line, e.g. "Embed widget"
}

/** What the React side can ask of the running field (exposed via FieldContext). */
export interface FieldApi {
  /** Current continuous progress over all stops. */
  getProgress(): number
  /** Subscribe to progress updates (called every frame while it changes). Returns unsubscribe. */
  onProgress(cb: (p: number) => void): () => void
  /** Index of the stop with this key, or -1. */
  stopIndex(key: string): number
  /** Pulse a stop's shape (hover, cube turn finished…). */
  pulse(key: string, strength?: number): void
  /** Smooth-scroll to an element or #id (eased, nav offset); instant under reduced motion. */
  scrollTo(target: string | HTMLElement, opts?: { offset?: number; duration?: number }): void
  /** Re-read stops from the DOM (call after content that changes stops has rendered). */
  refresh(): void
  /** True when WebGL is unavailable or reduced motion is on (static fallback in use). */
  readonly isStatic: boolean
}
