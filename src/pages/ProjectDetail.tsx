/**
 * ProjectDetail — editorial case study layout.
 *
 * Top: mono index bar (back link, current index).
 * Hero: massive Boldonse title with year as a typographic counterpart,
 *       gradient panel acts as a tactile "swatch" beside the type
 *       rather than a full-bleed bg.
 * Body: meta ledger (mono), overview prose, two-column challenge/solution,
 *       gradient swatch, mono tech stack list, results as oversized
 *       numerals, next-project teaser.
 */

import { useEffect, useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import { useProjects } from '../context/ContentContext'
import { incrementProjectViews } from '../lib/api'

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const, delay: i * 0.06 },
  }),
}

export default function ProjectDetail() {
  const { slug } = useParams()
  const projects = useProjects()

  const project      = projects.find(p => p.slug === slug)
  const currentIndex = projects.findIndex(p => p.slug === slug)
  const nextProject  = projects[(currentIndex + 1) % projects.length]

  const [views, setViews] = useState<number | null>(null)

  useEffect(() => { window.scrollTo(0, 0) }, [slug])

  useEffect(() => {
    if (!project) return
    incrementProjectViews(project.slug).then(v => { if (v > 0) setViews(v) })
  }, [project?.slug])

  // Reveal observer for the below-the-fold sections.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const targets = document.querySelectorAll('.pd .reveal')
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
    )
    targets.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [slug])

  if (!project) return <Navigate to="/" replace />

  return (
    <motion.div
      className="pd"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Helmet>
        <title>{project.title} — Case Study</title>
        <meta name="description" content={project.description} />
        <meta property="og:title" content={`${project.title} — Case Study`} />
        <meta property="og:description" content={project.description} />
      </Helmet>

      {/* ── Topbar ── */}
      <div className="container pd-topbar">
        <Link to="/" className="pd-back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to work
        </Link>
        <span className="pd-topbar-meta">
          <span className="pd-topbar-num">{project.id}</span>
          <span className="pd-topbar-sep" aria-hidden> / </span>
          <span className="pd-topbar-total">{String(projects.length).padStart(2, '0')}</span>
          <span className="pd-topbar-sep" aria-hidden> · </span>
          <span>{project.year}</span>
        </span>
      </div>

      {/* ── Hero ── */}
      <motion.section
        className="container pd-hero"
        custom={0}
        variants={fadeUp}
        initial="hidden"
        animate="show"
      >
        <div className="pd-hero-grid">
          <div className="pd-hero-text">
            <span className="pd-eyebrow">
              <span className="pd-eyebrow-num">Case study</span>
              <span className="pd-eyebrow-rule" aria-hidden />
            </span>
            <h1 className="pd-title">{project.title}</h1>
            <p className="pd-subtitle">{project.subtitle}</p>
          </div>
          <motion.div
            className="pd-swatch pd-swatch--hero"
            style={{ background: project.gradient }}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="pd-swatch-watermark" aria-hidden>{project.id}</span>
            <div className="pd-swatch-spec pd-swatch-spec--top">
              <span className="pd-swatch-mark">REF</span>
              <span className="pd-swatch-rule" aria-hidden />
              <span>{project.id} / {String(projects.length).padStart(2, '0')}</span>
            </div>
            <div className="pd-swatch-spec pd-swatch-spec--bot">
              <span className="pd-swatch-mark">Gradient</span>
              <span className="pd-swatch-rule" aria-hidden />
              <span>{project.year}</span>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ── Meta ledger ── */}
      <motion.section
        className="container pd-meta"
        custom={1}
        variants={fadeUp}
        initial="hidden"
        animate="show"
      >
        <div className="pd-meta-item">
          <span className="pd-meta-label">Role</span>
          <span className="pd-meta-value">{project.role}</span>
        </div>
        <div className="pd-meta-item">
          <span className="pd-meta-label">Timeline</span>
          <span className="pd-meta-value">{project.timeline}</span>
        </div>
        <div className="pd-meta-item">
          <span className="pd-meta-label">Year</span>
          <span className="pd-meta-value">{project.year}</span>
        </div>
        {views !== null && (
          <div className="pd-meta-item">
            <span className="pd-meta-label">Views</span>
            <span className="pd-meta-value">{views.toLocaleString()}</span>
          </div>
        )}
        {project.link && (
          <div className="pd-meta-item">
            <span className="pd-meta-label">Live</span>
            <a href={project.link} target="_blank" rel="noopener noreferrer" className="pd-meta-link">
              GitHub
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M7 17L17 7M9 7h8v8" />
              </svg>
            </a>
          </div>
        )}
      </motion.section>

      {/* ── Overview ── */}
      <motion.section
        className="container pd-section"
        custom={2}
        variants={fadeUp}
        initial="hidden"
        animate="show"
      >
        <div className="pd-section-head">
          <span className="pd-section-eyebrow">
            <span className="pd-section-num">A</span>
            Overview
          </span>
          <span className="pd-section-rule" aria-hidden />
        </div>
        <p className="pd-prose pd-overview">{project.overview}</p>
      </motion.section>

      {/* ── Challenge / Solution ── */}
      <motion.section
        className="container pd-section"
        custom={3}
        variants={fadeUp}
        initial="hidden"
        animate="show"
      >
        <div className="pd-section-head">
          <span className="pd-section-eyebrow">
            <span className="pd-section-num">B</span>
            Problem &amp; approach
          </span>
          <span className="pd-section-rule" aria-hidden />
        </div>

        <div className="pd-split">
          <div className="pd-split-col">
            <h3 className="pd-split-heading">The challenge</h3>
            <p className="pd-prose">{project.challenge}</p>
          </div>
          <div className="pd-split-col">
            <h3 className="pd-split-heading">The solution</h3>
            <p className="pd-prose">{project.solution}</p>
          </div>
        </div>
      </motion.section>

      {/* ── Visual swatch — wide specimen plate ── */}
      <motion.section
        className="container"
        custom={4}
        variants={fadeUp}
        initial="hidden"
        animate="show"
      >
        <div className="pd-swatch pd-swatch--wide" style={{ background: project.gradient }}>
          <span className="pd-swatch-watermark pd-swatch-watermark--wide" aria-hidden>
            <em>{project.title.split(' ')[0]}</em>
          </span>
          <div className="pd-swatch-spec pd-swatch-spec--top">
            <span className="pd-swatch-mark">Fig</span>
            <span className="pd-swatch-rule" aria-hidden />
            <span>{project.id} · {project.title}</span>
          </div>
          <div className="pd-swatch-spec pd-swatch-spec--bot">
            <span className="pd-swatch-mark">{project.year}</span>
            <span className="pd-swatch-rule" aria-hidden />
            <span>{project.role}</span>
          </div>
        </div>
      </motion.section>

      {/* ── Tech stack ── */}
      <section className="container pd-section">
        <div className="pd-section-head reveal">
          <span className="pd-section-eyebrow">
            <span className="pd-section-num">C</span>
            Stack
          </span>
          <span className="pd-section-rule" aria-hidden />
        </div>
        <ul className="pd-tags reveal">
          {project.tags.map((t, i) => (
            <li key={t} className="pd-tag">
              <span className="pd-tag-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="pd-tag-text">{t}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Results ── */}
      <section className="container pd-section">
        <div className="pd-section-head reveal">
          <span className="pd-section-eyebrow">
            <span className="pd-section-num">D</span>
            Results
          </span>
          <span className="pd-section-rule" aria-hidden />
        </div>
        <ul className="pd-results">
          {project.results.map(r => (
            <li key={r.label} className="pd-result reveal">
              <span className="pd-result-value">{r.value}</span>
              <span className="pd-result-label">{r.label}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Next ── */}
      <section className="container pd-next reveal">
        <div className="pd-section-head">
          <span className="pd-section-eyebrow">
            <span className="pd-section-num">→</span>
            Next
          </span>
          <span className="pd-section-rule" aria-hidden />
        </div>

        <Link to={`/project/${nextProject.slug}`} className="pd-next-link">
          <span className="pd-next-num">{nextProject.id}</span>
          <span className="pd-next-content">
            <span className="pd-next-title">{nextProject.title}</span>
            <span className="pd-next-sub">{nextProject.subtitle}</span>
          </span>
          <span
            className="pd-next-swatch"
            style={{ background: nextProject.gradient }}
            aria-hidden
          />
          <span className="pd-next-arrow" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </span>
        </Link>
      </section>
    </motion.div>
  )
}
