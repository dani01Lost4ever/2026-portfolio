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
 * `useContent()` instead and always get the most up-to-date values.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import type { ContentBundle } from '../lib/types'
import { fetchAllContent } from '../lib/api'

// ─── JSON fallbacks (used as the initial state) ───────────────────────────────
import siteJson       from '../data/site.json'
import heroJson       from '../data/hero.json'
import projectsJson   from '../data/projects.json'
import aboutJson      from '../data/about.json'
import contactJson    from '../data/contact.json'
import experienceJson from '../data/experience.json'

const defaultContent: ContentBundle = {
  site:       siteJson       as ContentBundle['site'],
  hero:       heroJson       as ContentBundle['hero'],
  projects:   (projectsJson as ContentBundle['projects']).map((p, i) => ({ ...p, order: i })),
  about:      aboutJson      as ContentBundle['about'],
  contact:    contactJson    as ContentBundle['contact'],
  experience: experienceJson as ContentBundle['experience'],
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ContentContext = createContext<ContentBundle>(defaultContent)

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

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useContent(): ContentBundle {
  return useContext(ContentContext)
}

// Convenience slice hooks
export const useSite       = () => useContent().site
export const useHero       = () => useContent().hero
export const useProjects   = () => useContent().projects
export const useAbout      = () => useContent().about
export const useContact    = () => useContent().contact
export const useExperience = () => useContent().experience
