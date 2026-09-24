import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useField } from '../field/useField'

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/** Move keyboard focus to a section after jumping to it, without a second scroll. */
function focusSection(el: HTMLElement) {
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
  el.focus({ preventScroll: true })
}

/**
 * Returns `jump(id)`: on the home page it eases to the section through the
 * field's smooth scroll (falling back to native scrolling when the field is
 * not running); on any other route it navigates to `/#id`, and the app's
 * scroll manager lands on the section once the home page has rendered.
 */
export function useSectionJump() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const field = useField()
  const onHome = pathname === '/'

  const jump = useCallback((id: string) => {
    if (!onHome) {
      navigate(`/#${id}`)
      return
    }
    const el = document.getElementById(id)
    if (!el) return
    if (field) field.scrollTo(el)
    else el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
    if (window.location.hash !== `#${id}`) window.history.replaceState(window.history.state, '', `#${id}`)
    focusSection(el)
  }, [onHome, navigate, field])

  return { jump, onHome }
}
