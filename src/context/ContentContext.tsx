/**
 * ContentContext
 *
 * Provides all CMS content to the component tree.
 *
 * Strategy:
 *   1. Initialise from local JSON files → instant render, zero flicker.
 *   2. Fetch from PocketBase in the background.
 *   3. Swap to live data once the fetch resolves.
 *
 * Components never need to import JSON files directly — they call
 * `useContent()` (or a slice hook) instead and always get the most
 * up-to-date values. Those hooks and the underlying context object live in
 * ./content-hooks — this file exports only the `ContentProvider` component,
 * which is what react-refresh/only-export-components requires of a
 * component file.
 */

import { useEffect, useState, type ReactNode } from 'react'

import type { ContentBundle } from '../lib/types'
import { fetchAllContent } from '../lib/api'
import { ContentContext, defaultContent } from './content-hooks'

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ContentBundle>(defaultContent)

  useEffect(() => {
    fetchAllContent()
      .then(setContent)
      .catch(() => {
        // PocketBase unavailable — keep displaying the JSON defaults silently.
        console.info('[ContentContext] PocketBase unreachable, using local JSON fallback.')
      })
  }, [])

  return (
    <ContentContext.Provider value={content}>
      {children}
    </ContentContext.Provider>
  )
}
