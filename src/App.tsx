import { lazy, Suspense, useEffect, useState } from 'react'
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
import Marquee        from './components/Marquee'
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
      <Marquee />
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
  const [loaderDone, setLoaderDone] = useState(
    () => sessionStorage.getItem('loader-done') === '1'
  )
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Smooth scroll via Lenis
  useEffect(() => {
    const lenis = new Lenis()
    const raf = (time: number) => { lenis.raf(time); requestAnimationFrame(raf) }
    requestAnimationFrame(raf)
    return () => lenis.destroy()
  }, [])

  // Lock scroll while loader is running
  useEffect(() => {
    document.body.style.overflow = loaderDone ? '' : 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [loaderDone])

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
      {!loaderDone && <Loader onComplete={handleLoaderComplete} />}

      <Grain />
      <Cursor />
      <ScrollProgress />
      <Navbar onOpenPalette={() => setPaletteOpen(true)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      <Suspense fallback={<div className="page-loading" />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/"              element={<HomePage />} />
            <Route path="/project/:slug" element={<ProjectDetail />} />
            <Route path="*"              element={<NotFound />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </ContentProvider>
  )
}
