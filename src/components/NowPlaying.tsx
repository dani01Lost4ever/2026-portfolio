/**
 * NowPlaying — the "what I'm doing right now" band that replaces
 * the generic word marquee. Pulls from src/data/now.json so the
 * content is editable without touching the component.
 *
 * Visual: a quiet status strip below the hero with three or four
 * `Now building` / `Now reading` / `Now shipping` items separated by
 * accent dots. The band drifts slowly horizontally; on hover the
 * drift pauses so visitors can read it. The whole thing is
 * keyboard-accessible (read-only) — no interactive elements inside.
 */

import { useMemo } from 'react'
import nowData from '../data/now.json'

interface NowItem {
  label: string
  value: string
}

export default function NowPlaying() {
  // Triple the list so the loop is seamless.
  const loop = useMemo(() => {
    const items = nowData.items as NowItem[]
    return [...items, ...items, ...items]
  }, [])

  return (
    <section className="now-playing" aria-label="Now">
      <div className="now-playing-track" role="list">
        {loop.map((item, i) => (
          <span key={i} className="now-playing-item" role="listitem">
            <span className="now-playing-label">{item.label}</span>
            <span className="now-playing-value">{item.value}</span>
            <span className="now-playing-sep" aria-hidden />
          </span>
        ))}
      </div>
    </section>
  )
}
