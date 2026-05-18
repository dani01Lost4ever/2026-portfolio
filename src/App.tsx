import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import Lenis from 'lenis'
import './App.css'

import { ContentProvider, useHero } from './context/ContentContext'
import Navbar         from './components/Navbar'
import Cursor         from './components/Cursor'
import ScrollProgress from './components/ScrollProgress'
import Hero           from './components/Hero'
import NowPlaying     from './components/NowPlaying'
import Work           from './components/Work'
import About          from './components/About'
import Experience     from './components/Experience'
import Contact        from './components/Contact'
import Loader         from './components/Loader'
import CommandPalette from './components/CommandPalette'
import Grain          from './components/Grain'

// Lazy-loaded routes
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'))
const NotFound      = lazy(() => import('./pages/NotFound'))
const PreviewMockA  = lazy(() => import('./pages/preview/MockA'))
const PreviewMockB  = lazy(() => import('./pages/preview/MockB'))
const PreviewMockC  = lazy(() => import('./pages/preview/MockC'))

// ─── Home page meta ────────────────────────────────────────────────────────────
function HomeSeo() {
  const hero = useHero()
  return (
    <Helmet>
      <title>{hero.name ? `${hero.name} — Portfolio` : 'Portfolio'}</title>
      <meta name="description" content={hero.subtitle} />
      <meta property="og:title" content={hero.name ? `${hero.name} — Portfolio` : 'Portfolio'} />
      <meta property="og:description" content={hero.subtitle} />
      <meta name="twitter:card" content="summary_large_image" />
    </Helmet>
  )
}

// ─── Home page ─────────────────────────────────────────────────────────────────
function HomePage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) entry.target.classList.add('is-visible')
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
    )
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <main>
      <HomeSeo />
      <Hero />
      <NowPlaying />
      <Work />
      <About />
      <Experience />
      <Contact />
    </main>
  )
}

// ─── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const location = useLocation()
  const isPreview = location.pathname.startsWith('/preview')
  const [loaderDone, setLoaderDone] = useState(
    () => isPreview || sessionStorage.getItem('loader-done') === '1'
  )
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Smooth scroll via Lenis. Held in a ref so other effects can
  // stop/start it (e.g. when the command palette is open).
  const lenisRef = useRef<Lenis | null>(null)
  useEffect(() => {
    const lenis = new Lenis()
    lenisRef.current = lenis
    const raf = (time: number) => { lenis.raf(time); requestAnimationFrame(raf) }
    requestAnimationFrame(raf)
    return () => {
      lenis.destroy()
      lenisRef.current = null
    }
  }, [])

  // Lock scroll while loader is running
  useEffect(() => {
    document.body.style.overflow = loaderDone ? '' : 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [loaderDone])

  // Stop Lenis + lock body while the command palette is open, so wheel
  // events inside the palette scroll the list instead of the page behind.
  useEffect(() => {
    if (paletteOpen) {
      lenisRef.current?.stop()
      document.body.style.overflow = 'hidden'
    } else if (loaderDone) {
      lenisRef.current?.start()
      document.body.style.overflow = ''
    }
  }, [paletteOpen, loaderDone])

  // Global ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Re-run reveal observer on route change back to home
  useEffect(() => {
    if (location.pathname !== '/') return
    const timer = setTimeout(() => {
      const observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('is-visible')
          })
        },
        { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
      )
      document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
      return () => observer.disconnect()
    }, 100)
    return () => clearTimeout(timer)
  }, [location.pathname])

  function handleLoaderComplete() {
    sessionStorage.setItem('loader-done', '1')
    setLoaderDone(true)
  }

  return (
    <ContentProvider>
      {!loaderDone && !isPreview && <Loader onComplete={handleLoaderComplete} />}

      {!isPreview && (
        <>
          <Grain />
          <Cursor />
          <ScrollProgress />
          <Navbar onOpenPalette={() => setPaletteOpen(true)} />
          <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
        </>
      )}

      <Suspense fallback={<div className="page-loading" />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/"              element={<HomePage />} />
            <Route path="/project/:slug" element={<ProjectDetail />} />
            <Route path="/preview"       element={<PreviewMockA />} />
            <Route path="/preview/a"     element={<PreviewMockA />} />
            <Route path="/preview/b"     element={<PreviewMockB />} />
            <Route path="/preview/c"     element={<PreviewMockC />} />
            <Route path="*"              element={<NotFound />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </ContentProvider>
  )
}
