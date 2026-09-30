/**
 * prototypes.ts — helpers for the prototype gallery (src/data/prototypes.json).
 *
 * A prototype lives either in designs/ (served at /designs/, see vite.config.ts)
 * or anywhere else behind a full URL. Its card shows its screenshot, or a
 * poster when it has none; its page runs it live in a frame unless `embed`
 * is false.
 */

import type { Prototype, ShapeId } from './types'
import { isShapeId } from './projectVisuals'

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

/**
 * The entries worth showing, in the file's order: each needs a slug and a title, a slug
 * counts once, and missing text fields and stack come back empty rather than undefined.
 */
export function listPrototypes(items: readonly Prototype[] | undefined): Prototype[] {
  const seen = new Set<string>()
  const out: Prototype[] = []
  for (const p of Array.isArray(items) ? items : []) {
    const slug = text(p?.slug), title = text(p?.title)
    if (!slug || !title || seen.has(slug)) continue
    seen.add(slug)
    out.push({
      ...p,
      slug,
      title,
      year: text(p.year),
      kind: text(p.kind),
      description: text(p.description),
      stack: Array.isArray(p.stack) ? p.stack.map(text).filter(Boolean) : [],
      url: text(p.url) || undefined,
      image: text(p.image) || undefined,
      status: text(p.status) || undefined,
    })
  }
  return out
}

/** The poster drawn when there is no screenshot. */
export function prototypeShape(p: Prototype): ShapeId {
  return isShapeId(p.shape) ? p.shape : 'browser'
}

/** Whether its page runs it live in a frame. */
export function canEmbed(p: Prototype): boolean {
  return !!p.url && p.embed !== false
}

/** The address in a browser frame's bar: host and path, without the scheme ("example.com/designs/take.html"). */
export function displayUrl(url: string | undefined): string {
  if (!url) return ''
  try {
    const u = new URL(url, window.location.href)
    const path = u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '')
    return u.host + path
  } catch {
    return url
  }
}

/** The prototype's page on this site. */
export function prototypePath(p: Prototype): string {
  return `/prototypes/${encodeURIComponent(p.slug)}`
}

/** "01", "02", … */
export function prototypeNumber(i: number): string {
  return String(i + 1).padStart(2, '0')
}
