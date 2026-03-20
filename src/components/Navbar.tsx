import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import siteData from '../data/site.json'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState('')
  const location = useLocation()
  const isHome = location.pathname === '/'

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20)

      if (!isHome) return
      const sections = ['work', 'about', 'contact']
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
        <Link to="/" className="navbar-logo">{siteData.logo}</Link>
        <ul className="navbar-nav">
          {siteData.nav.map(({ label, href }) => {
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
      </div>
    </nav>
  )
}
