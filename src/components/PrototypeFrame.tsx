/**
 * The prototype gallery's pictures: a browser window's bar (three dots, the
 * address in a pill) and a prototype's screenshot, or its poster when it has
 * no screenshot or the file fails to load.
 */

import { useState } from 'react'
import type { Prototype } from '../lib/types'
import { prototypeShape } from '../lib/prototypes'
import { Poster } from '../take/Poster'

export function BrowserBar({ url }: { url: string }) {
  return (
    <div className="pf-bar" aria-hidden="true">
      <span className="pf-dots"><i /><i /><i /></span>
      <span className="pf-url">{url}</span>
    </div>
  )
}

export function PrototypeShot({ p, className }: { p: Prototype; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null)
  if (p.image && failed !== p.image) {
    return (
      <img
        className={className}
        src={p.image}
        alt=""
        width={1440}
        height={900}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(p.image ?? null)}
      />
    )
  }
  return <Poster shape={prototypeShape(p)} className={className} />
}
