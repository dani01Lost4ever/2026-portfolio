import { useEffect, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Lenis from 'lenis'
import './App.css'

import { ContentProvider } from './context/ContentContext'
import Navbar        from './components/Navbar'
import Cursor        from './components/Cursor'
import ScrollProgress from './components/ScrollProgress'
import Hero          from './components/Hero'
import Marquee       from './components/Marquee'
import Work          from './components/Work'
import About         from './components/About'
import Contact       from './components/Contact'
import Loader        from './components/Loader'
import ProjectDetail from './pages/ProjectDetail'

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
      <Hero />
      <Marquee />
      <Work />
      <About />
      <Contact />
    </main>
  )
}

export default function App() {
  const location = useLocation()
  const [loaderDone, setLoaderDone] = useState(
    () => sessionStorage.getItem('loader-done') === '1'
  )

  // Smooth scroll via Lenis
  useEffect(() => {
    const lenis = new Lenis()
    const raf = (time: number) => {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)
    return () => lenis.destroy()
  }, [])

  // Lock scroll while loader is running
  useEffect(() => {
    document.body.style.overflow = loaderDone ? '' : 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [loaderDone])

  function handleLoaderComplete() {
    sessionStorage.setItem('loader-done', '1')
    setLoaderDone(true)
  }

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

  return (
    <ContentProvider>
      {!loaderDone && <Loader onComplete={handleLoaderComplete} />}

      <Cursor />
      <ScrollProgress />
      <Navbar />

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/"               element={<HomePage />} />
          <Route path="/project/:slug"  element={<ProjectDetail />} />
        </Routes>
      </AnimatePresence>
    </ContentProvider>
  )
}
