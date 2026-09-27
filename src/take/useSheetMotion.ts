import { useEffect, useRef, type KeyboardEvent, type RefObject } from 'react'
import { clamp, lerp, lerpR, sprMs, type Rect } from './engine/math'

export interface SheetFrom extends Rect { r: number }

/** The rect a sheet opens to: centred under the header on desktop, nearly full screen on phones. */
export function sheetRect(): Rect {
  const vw = window.innerWidth, vh = window.innerHeight
  if (vw < 760) return { x: 10, y: 58, w: vw - 20, h: vh - 68 }
  const w = Math.min(vw - 96, 1180), h = Math.min(vh - 150, 720)
  return { x: (vw - w) / 2, y: (vh - h) / 2 + 12, w, h }
}

export const toFrom = (r: DOMRect, radius: number): SheetFrom => ({ x: r.left, y: r.top, w: r.width, h: r.height, r: Math.min(radius, r.height / 2) })

export interface SheetFrame {
  /** Open progress on a spring: 0 at the source rect, 1 open (may overshoot slightly). */
  p: number
  /** The sheet's rect this frame, and its target rect when open. */
  R: Rect
  S: Rect
  now: number
  openedAt: number
}

/**
 * Drives a sheet that grows out of the element that opened it and folds back into one
 * (the same or another) on close. Runs on real time, one spring per direction, and calls
 * `render` every frame so the sheet's insides can follow the same progress.
 * Returns `close(to)`: fold into `to`, then `onClosed`.
 */
export function useSheetMotion(sheet: RefObject<HTMLElement | null>, scrim: RefObject<HTMLElement | null>, from: SheetFrom,
  render: (f: SheetFrame) => void, onClosed: () => void) {
  const st = useRef({ from, openedAt: 0, closeAt: 0, closing: false })
  const renderRef = useRef(render)
  const closedRef = useRef(onClosed)
  useEffect(() => { renderRef.current = render; closedRef.current = onClosed })

  useEffect(() => {
    let raf = 0
    st.current.openedAt = performance.now()
    const tick = (now: number) => {
      const s = st.current, el = sheet.current
      let p: number
      if (s.closing) {
        p = 1 - sprMs(now, s.closeAt, 0.42, 1)
        if (p < 0.003) { closedRef.current(); return }
      } else p = sprMs(now, s.openedAt, 0.52, 0.84)
      const S = sheetRect(), R = lerpR(s.from, S, p)
      if (el) {
        el.style.transform = `translate(${R.x}px,${R.y}px)`
        el.style.width = R.w + 'px'; el.style.height = R.h + 'px'
        el.style.borderRadius = lerp(s.from.r, 26, clamp(p)) + 'px'
      }
      if (scrim.current) scrim.current.style.opacity = (0.32 * clamp(p)).toFixed(3)
      renderRef.current({ p, R, S, now, openedAt: s.openedAt })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [sheet, scrim])

  return {
    close(to: SheetFrom) {
      const s = st.current
      if (s.closing) return
      s.closing = true; s.closeAt = performance.now(); s.from = to
    },
  }
}

/** Tab stays inside the dialog. */
export function trapTab(e: KeyboardEvent, root: HTMLElement | null) {
  if (e.key !== 'Tab' || !root) return
  const f = [...root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter(el => el.getClientRects().length > 0 && !el.closest('[inert]'))
  if (!f.length) return
  const first = f[0], last = f[f.length - 1]
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
}
