import { createContext, useContext } from 'react'

/** The film's chapters, also the home page's URL hashes (`/#work`). `top` is the opening. */
export type ChapterId = 'top' | 'work' | 'case' | 'now' | 'experience' | 'about' | 'contact'

export const CHAPTER_IDS: readonly ChapterId[] = ['top', 'work', 'case', 'now', 'experience', 'about', 'contact']

export function isChapterId(value: string): value is ChapterId {
  return (CHAPTER_IDS as readonly string[]).includes(value)
}

/** What the rest of the app can ask of the film while the home page is mounted. */
export interface TakeApi {
  /** Glide the film to a chapter's rest frame. */
  goToChapter(id: ChapterId): void
}

/** Null when the film isn't running (other routes, or reduced motion). */
export const TakeContext = createContext<TakeApi | null>(null)

export function useTake(): TakeApi | null {
  return useContext(TakeContext)
}

/** How the mounted film registers its API with the provider (and clears it on unmount). */
export const TakeRegistry = createContext<(api: TakeApi | null) => void>(() => {})
