import { lazy, Suspense, useCallback, useEffect, useState, type MouseEvent } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'

import { ContentProvider } from './context/ContentContext'
import CommandPalette from './components/CommandPalette'
import Home from './pages/Home'
import { PosterDefs } from './take/Poster'
import { TakeProvider } from './take/TakeProvider'
import { useReducedMotion } from './take/useReducedMotion'

const ProjectDetail = lazy(() => import('./pages/ProjectDetail'))
const NotFound      = lazy(() => import('./pages/NotFound'))

/**
 * Top of the page on route change; a URL hash lands on its section once the page has rendered.
 * The film owns the home page's scroll (and reads its own hash), unless motion is reduced.
 */
function ScrollManager() {
  const { pathname, hash } = useLocation()
  const reduced = useReducedMotion()
  const film = pathname === '/' && !reduced

  useEffect(() => {
    if (film) return
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }
    let id = ''
    try { id = decodeURIComponent(hash.slice(1)) } catch { return }
    let tries = 0
    let raf = 0
    const land = () => {
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ block: 'start' })
      else if (tries++ < 60) raf = requestAnimationFrame(land) // lazy route still rendering
    }
    raf = requestAnimationFrame(land)
    return () => cancelAnimationFrame(raf)
  }, [pathname, hash, film])

  return null
}

function SkipLink() {
  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    const main = document.getElementById('main')
    if (!main) return
    e.preventDefault()
    main.focus({ preventScroll: true })
    main.scrollIntoView({ block: 'start' })
  }
  return <a className="skip-link" href="#main" onClick={onClick}>Skip to main content</a>
}

function Shell() {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const closePalette = useCallback(() => setPaletteOpen(false), [])

  // ⌘K / Ctrl+K toggles the command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <SkipLink />
      <ScrollManager />
      <CommandPalette open={paletteOpen} onClose={closePalette} />
      <Suspense fallback={<main id="main" tabIndex={-1} className="page-loading" aria-busy="true" />}>
        <Routes>
          <Route path="/"              element={<Home />} />
          <Route path="/project/:slug" element={<ProjectDetail />} />
          <Route path="*"              element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  )
}

export default function App() {
  return (
    <ContentProvider>
      <TakeProvider>
        <PosterDefs />
        <Shell />
      </TakeProvider>
    </ContentProvider>
  )
}
