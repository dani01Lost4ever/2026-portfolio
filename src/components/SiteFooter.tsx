/** SiteFooter — copyright and a way back to the top of the page, under a hairline. */

import type { MouseEvent } from 'react'
import { useContact } from '../context/content-hooks'

export default function SiteFooter() {
  const contact = useContact()

  function toTop(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
    document.getElementById('main')?.focus({ preventScroll: true })
  }

  return (
    <footer className="site-footer">
      <span>{contact.copyright}</span>
      <a href="#main" onClick={toTop}>Back to top</a>
    </footer>
  )
}
