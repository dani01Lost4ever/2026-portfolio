/** timeline.ts — the take's length, its chapters and the frames it rests on. */

import type { ChapterId } from '../TakeContext'
import type { TakeContent } from './content'

/** Length in beats. Frame T_END is frame 0, so the take loops without a seam. */
export const T_END = 71.5

/**
 * Rest frames: finished, readable states. The arrow keys move rest to rest, and the played
 * take holds on each one long enough to read it (restHolds).
 */
export const RESTS = [0, 5.7, 13.0, 16.2, 22.5, 30.3, 37.5, 45.4, 50.3, 53.95, 60.4, 65.5, T_END]

const LAND = 0.9, READ_WPS = 4, HOLD_MIN = 1.2, HOLD_MAX = 7

/**
 * Seconds the played take holds on each rest in RESTS: a moment to land, then the time to read
 * the words that frame shows, at a relaxed skim.
 */
export function restHolds(c: TakeContent): number[] {
  const words = (...s: (string | undefined)[]) => s.join(' ').split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length
  const lead = c.projects[0]
  const read = (n: number) => Math.min(HOLD_MAX, Math.max(HOLD_MIN, LAND + n / READ_WPS))
  return [
    read(words(c.wordmark)),
    read(words(c.tagline)),
    0.3, // the grid on its way to the bento
    read(words(...c.projects.map(p => p.title))),
    read(words(lead?.title, lead?.sub)),
    read(words(lead?.caption, c.lead, ...(lead?.results ?? []).flatMap(r => [r.value, r.label]))),
    read(words(...c.now.flatMap(n => [n.k, n.v]))),
    read(words(c.expIntro, ...c.exp.map(r => r.a))),
    read(words(c.aboutHeading, c.aboutBody)),
    read(words(c.stacks[0]?.n, c.stacks[0]?.s, 'Engagement Freelance Full-time')),
    HOLD_MIN, // delivered
    read(words(c.fullName, c.placardLine, c.availability, c.email)),
    read(words(c.wordmark)),
  ]
}

export const CHAPTERS: readonly { id: ChapterId; label: string; beat: number }[] = [
  { id: 'top', label: 'Intro', beat: 0 },
  { id: 'work', label: 'Work', beat: 16.2 },
  { id: 'case', label: 'Case', beat: 22.5 },
  { id: 'now', label: 'Now', beat: 37.5 },
  { id: 'experience', label: 'Experience', beat: 45.4 },
  { id: 'about', label: 'About', beat: 53.95 },
  { id: 'contact', label: 'Contact', beat: 65.5 },
]

/** The chapter on screen at beat b: each one starts half a beat before its beat. */
export function chapterAt(b: number): number {
  let on = 0
  CHAPTERS.forEach((ch, i) => { if (b >= ch.beat - 0.5) on = i })
  return on
}

/** Where the bento rests and its tiles can be opened. */
export const BENTO_OPEN: readonly [number, number] = [14.9, 17.4]
export const CASE_BEAT = 22.5
