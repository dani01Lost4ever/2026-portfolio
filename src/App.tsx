import { lazy, Suspense, useCallback, useEffect, useState, type MouseEvent } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'

import { ContentProvider } from './context/ContentContext'
import { FieldProvider } from './field/FieldProvider'
import { FieldCanvas } from './field/FieldCanvas'
import { useField } from './field/useField'
import Nav from './components/Nav'
import CommandPalette from './components/CommandPalette'
import Home from './pages/Home'

const ProjectDetail = lazy(() => import('./pages/ProjectDetail'))
const NotFound      = lazy(() => import('./pages/NotFound'))

/** Top of the page on route change; a URL hash lands on its section once the page has rendered. */
function ScrollManager() {
  const { pathname, hash } = useLocation()
  const field = useField()

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }
    const id = decodeURIComponent(hash.slice(1))
    let tries = 0
    let raf = 0
    const land = () => {
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ block: 'start' })
        field?.refresh()
      } else if (tries++ < 30) {
        raf = requestAnimationFrame(land) // lazy route still rendering
      }
    }
    raf = requestAnimationFrame(land)
    return () => cancelAnimationFrame(raf)
    // field is deliberately left out: landing on a hash must not repeat when the field comes up
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, hash])

  return null
}

/** Mirrors the field's static fallback onto <html> so CSS can drop the mobile scrim and text halos. */
function StaticFlag() {
  const field = useField()
  useEffect(() => {
    if (field) document.documentElement.classList.toggle('static', field.isStatic)
  }, [field])
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
      <StaticFlag />
      <Nav />
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
      <FieldProvider>
        <FieldCanvas />
        <div className="scrim" aria-hidden="true" />
        <Shell />
      </FieldProvider>
    </ContentProvider>
  )
}
