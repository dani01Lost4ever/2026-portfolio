/**
 * content-hooks.ts
 *
 * The context object, its default (JSON) value, and the `useContent`/slice
 * hooks — split out of ContentContext.tsx so that file can export only the
 * `ContentProvider` component. Fast Refresh (react-refresh/only-export-
 * components) requires a component file to export nothing else, and these
 * hooks are plain functions, not components.
 *
 * Public hook API is unchanged: `useContent`, `useSite`, `useHero`,
 * `useProjects`, `useAbout`, `useContact`, `useExperience`.
 */

import { createContext, useContext } from 'react'

import type { ContentBundle } from '../lib/types'

// ─── JSON fallbacks (used as the initial state) ───────────────────────────────
import siteJson       from '../data/site.json'
import heroJson       from '../data/hero.json'
import projectsJson   from '../data/projects.json'
import aboutJson      from '../data/about.json'
import contactJson    from '../data/contact.json'
import experienceJson from '../data/experience.json'

export const defaultContent: ContentBundle = {
  site:       siteJson       as ContentBundle['site'],
  hero:       heroJson       as ContentBundle['hero'],
  projects:   (projectsJson as ContentBundle['projects']).map((p, i) => ({ ...p, order: i })),
  about:      aboutJson      as ContentBundle['about'],
  contact:    contactJson    as ContentBundle['contact'],
  experience: experienceJson as ContentBundle['experience'],
}

export const ContentContext = createContext<ContentBundle>(defaultContent)

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
