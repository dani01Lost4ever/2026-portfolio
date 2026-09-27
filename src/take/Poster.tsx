import { memo } from 'react'
import type { ShapeId } from '../lib/types'
import { posterDefsMarkup, posterFor } from './posters'

const DEFS = posterDefsMarkup()

/**
 * The poster symbols, filters and wallpaper, once per page. Hidden but not display:none:
 * gradients and clip paths inside a display:none SVG stop rendering where they are used.
 */
export const PosterDefs = memo(function PosterDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute', left: 0, top: 0 }}>
      <defs dangerouslySetInnerHTML={{ __html: DEFS }} />
    </svg>
  )
})

/** A project's poster, filling its box (cropped, never stretched). */
export function Poster({ shape, className }: { shape: ShapeId; className?: string }) {
  const p = posterFor(shape)
  return (
    <svg className={className} aria-hidden="true" focusable="false" style={{ background: p.bg }}>
      <use href={`#${p.sym}`} width="100%" height="100%" />
    </svg>
  )
}
