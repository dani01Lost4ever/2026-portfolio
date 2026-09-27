import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { isChapterId, useTake } from '../take/TakeContext'

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/** Move keyboard focus to a section after jumping to it, without a second scroll. */
function focusSection(el: HTMLElement) {
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
  el.focus({ preventScroll: true })
}

function setHash(id: string) {
  if (window.location.hash !== `#${id}`) window.history.replaceState(window.history.state, '', `#${id}`)
}

/**
 * Returns `jump(id)`: on the home page it glides the film to the chapter when
 * the film is running, or scrolls the reading page to the section with that id
 * when it isn't (reduced motion); on any other route it navigates to `/#id`,
 * and the home page lands on the chapter once it has rendered.
 */
export function useSectionJump() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const take = useTake()
  const onHome = pathname === '/'

  const jump = useCallback((id: string) => {
    if (!onHome) {
      navigate(`/#${id}`)
      return
    }
    if (take && isChapterId(id)) {
      take.goToChapter(id)
      setHash(id)
      return
    }
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
    setHash(id)
    focusSection(el)
  }, [onHome, navigate, take])

  return { jump, onHome }
}
