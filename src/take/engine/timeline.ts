/** timeline.ts — the take's length, its chapters and the frames it rests on. */

import type { ChapterId } from '../TakeContext'

/** Length in beats. Frame T_END is frame 0, so the take loops without a seam. */
export const T_END = 71.5

/**
 * Rest frames: finished, readable states. Manual scrolling always ends on one of these;
 * releasing between two plays on to the end of the piece or rewinds to its start.
 */
export const RESTS = [0, 5.7, 13.0, 16.2, 22.5, 30.3, 37.5, 45.4, 50.3, 53.95, 60.4, 65.5, T_END]

export const CHAPTERS: readonly { id: ChapterId; label: string; beat: number }[] = [
  { id: 'top', label: 'Intro', beat: 0 },
  { id: 'work', label: 'Work', beat: 16.2 },
  { id: 'case', label: 'Case', beat: 22.5 },
  { id: 'now', label: 'Now', beat: 37.5 },
  { id: 'experience', label: 'Experience', beat: 45.4 },
  { id: 'about', label: 'About', beat: 53.95 },
  { id: 'contact', label: 'Contact', beat: 65.5 },
]

/** Where the bento rests and its tiles can be opened. */
export const BENTO_OPEN: readonly [number, number] = [14.9, 17.4]
export const CASE_BEAT = 22.5
