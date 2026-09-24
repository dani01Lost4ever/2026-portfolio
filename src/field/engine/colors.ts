/**
 * Colour parsing for data-tint / data-bg, and the CSS variables the page paints its gradient from.
 */
import { clamp, hexToRgb, lerp, type RGB } from './math'

const HEX = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi

/** Parse "top,bottom" (or any text containing hex colours, e.g. a CSS gradient): first and last colour. */
export function parseColorPair(s: string | null | undefined): [RGB, RGB] | null {
  if (!s) return null
  const m = s.match(HEX)
  if (!m || !m.length) return null
  return [hexToRgb(m[0]), hexToRgb(m[m.length - 1])]
}

function rgbToHsl([r, g, b]: RGB): RGB {
  const mx = Math.max(r, g, b)
  const mn = Math.min(r, g, b)
  const l = (mx + mn) / 2
  if (mx === mn) return [0, 0, l]
  const d = mx - mn
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
  let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  h /= 6
  return [h, s, l]
}

function hslToRgb([h, s, l]: RGB): RGB {
  if (s === 0) return [l, l, l]
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const f = (t: number): number => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)]
}

/**
 * Points are drawn with additive blending, so a very dark tint would make its shape vanish.
 * Lift dark colours (keeping hue) and turn near-greys into pearl. Mid/bright colours pass through.
 */
export function liftTint(c: RGB): RGB {
  const [h, s, l] = rgbToHsl(c)
  if (s < 0.12 && l < 0.7) return hslToRgb([0.62, 0.08, 0.84])
  if (l < 0.38) return hslToRgb([h, clamp(s, 0.35, 0.85), 0.6])
  return c
}

export const mixRgb = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]

const to255 = (c: RGB): [number, number, number] => [
  Math.round(clamp(c[0], 0, 1) * 255), Math.round(clamp(c[1], 0, 1) * 255), Math.round(clamp(c[2], 0, 1) * 255),
]
const hex255 = (c: [number, number, number]): string => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')

export const BG_VARS = ['--field-bg-a', '--field-bg-b', '--field-bg-a-rgb', '--field-bg-b-rgb', '--field-scrim'] as const

/**
 * Writes the page gradient variables on <html> only when their rounded value changes:
 *   --field-bg-a / --field-bg-b          hex, top and bottom (contract)
 *   --field-bg-a-rgb / --field-bg-b-rgb  "r,g,b" triplets for rgba() use (e.g. a nav scrim)
 *   --field-scrim                        0..1 suggested mobile scrim opacity (dips on the clusters stop)
 */
export class BgVarWriter {
  private last = ''
  private readonly style = document.documentElement.style

  write(a: RGB, b: RGB, scrim: number): void {
    const A = to255(a)
    const B = to255(b)
    const sc = scrim.toFixed(2)
    const key = A.join(',') + '|' + B.join(',') + '|' + sc
    if (key === this.last) return
    this.last = key
    this.style.setProperty('--field-bg-a', hex255(A))
    this.style.setProperty('--field-bg-b', hex255(B))
    this.style.setProperty('--field-bg-a-rgb', A.join(','))
    this.style.setProperty('--field-bg-b-rgb', B.join(','))
    this.style.setProperty('--field-scrim', sc)
  }

  clear(): void {
    this.last = ''
    for (const v of BG_VARS) this.style.removeProperty(v)
  }
}
