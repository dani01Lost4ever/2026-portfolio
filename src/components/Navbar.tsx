import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useSite } from '../context/ContentContext'

interface Props {
  onOpenPalette: () => void
}

export default function Navbar({ onOpenPalette }: Props) {
  const site = useSite()
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive]     = useState('')
  const location = useLocation()
  const isHome = location.pathname === '/'

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20)
      if (!isHome) return
      const sections = ['work', 'about', 'experience', 'contact']
      let current = ''
      for (const id of sections) {
        const el = document.getElementById(id)
        if (el && window.scrollY >= el.offsetTop - 120) current = id
      }
      setActive(current)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isHome])

  return (
    <nav className={`navbar${scrolled ? ' navbar--scrolled' : ''}`}>
      <div className="navbar-inner container">
        <Link to="/" className="navbar-logo">{site.logo}</Link>

        <ul className="navbar-nav">
          {site.nav.map(({ label, href }) => {
            const sectionId = href.replace('/#', '')
            return (
              <li key={label}>
                <a
                  href={href}
                  className={`navbar-link${active === sectionId ? ' is-active' : ''}`}
                >
                  {label}
                </a>
              </li>
            )
          })}
        </ul>

        <button
          className="navbar-search"
          onClick={onOpenPalette}
          aria-label="Open command palette"
          title="Search (⌘K)"
        >
          <svg width="14" height="14" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <span className="navbar-search-label">Search…</span>
          <kbd>⌘K</kbd>
        </button>
      </div>
    </nav>
  )
}
