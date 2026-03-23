import { useEffect, useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import { useProjects } from '../context/ContentContext'
import { incrementProjectViews } from '../lib/api'

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: i * 0.08 },
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

  // Increment and display view counter
  useEffect(() => {
    if (!project) return
    incrementProjectViews(project.slug).then(v => { if (v > 0) setViews(v) })
  }, [project?.slug])

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

      {/* Top bar */}
      <div className="pd-topbar container">
        <Link to="/" className="pd-back">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Work
        </Link>
        <span className="pd-topbar-index">{project.id} / 0{projects.length}</span>
      </div>

      {/* Hero cover */}
      <motion.div
        className="pd-cover"
        style={{ background: project.gradient }}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="pd-cover-id">{project.id}</span>
      </motion.div>

      {/* Project header */}
      <div className="container pd-header">
        <motion.div className="pd-header-left" custom={0} variants={fadeUp} initial="hidden" animate="show">
          <h1 className="pd-title">{project.title}</h1>
          <p className="pd-subtitle">{project.subtitle}</p>
        </motion.div>
        <motion.div className="pd-header-right" custom={1} variants={fadeUp} initial="hidden" animate="show">
          <span className="pd-year">{project.year}</span>
        </motion.div>
      </div>

      {/* Meta row */}
      <motion.div className="container pd-meta" custom={2} variants={fadeUp} initial="hidden" animate="show">
        <div className="pd-meta-item">
          <span className="pd-meta-label">Role</span>
          <span>{project.role}</span>
        </div>
        <div className="pd-meta-item">
          <span className="pd-meta-label">Timeline</span>
          <span>{project.timeline}</span>
        </div>
        <div className="pd-meta-item">
          <span className="pd-meta-label">Year</span>
          <span>{project.year}</span>
        </div>
        {views !== null && (
          <div className="pd-meta-item">
            <span className="pd-meta-label">Views</span>
            <span className="pd-views">{views.toLocaleString()}</span>
          </div>
        )}
        {project.link && (
          <div className="pd-meta-item">
            <span className="pd-meta-label">Live</span>
            <a href={project.link} target="_blank" rel="noopener noreferrer" className="pd-meta-link">
              View Site →
            </a>
          </div>
        )}
      </motion.div>

      <div className="pd-divider container" />

      {/* Overview */}
      <motion.div className="container pd-section" custom={3} variants={fadeUp} initial="hidden" animate="show">
        <p className="pd-section-label">Overview</p>
        <p className="pd-overview">{project.overview}</p>
      </motion.div>

      <div className="pd-divider container" />

      {/* Challenge + Solution */}
      <motion.div className="container pd-split" custom={4} variants={fadeUp} initial="hidden" animate="show">
        <div className="pd-split-col">
          <p className="pd-section-label">The Challenge</p>
          <p>{project.challenge}</p>
        </div>
        <div className="pd-split-col">
          <p className="pd-section-label">The Solution</p>
          <p>{project.solution}</p>
        </div>
      </motion.div>

      {/* Visual placeholder */}
      <div className="container">
        <div className="pd-visual" style={{ background: project.gradient }} />
      </div>

      <div className="pd-divider container" />

      {/* Tech stack */}
      <div className="container pd-section reveal">
        <p className="pd-section-label">Tech Stack</p>
        <div className="pd-tags">
          {project.tags.map(t => (
            <span key={t} className="tag tag-lg">{t}</span>
          ))}
        </div>
      </div>

      <div className="pd-divider container" />

      {/* Results */}
      <div className="container pd-section reveal">
        <p className="pd-section-label">Key Results</p>
        <div className="pd-results">
          {project.results.map(r => (
            <div key={r.label} className="pd-result-card">
              <span className="pd-result-value">{r.value}</span>
              <span className="pd-result-label">{r.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pd-divider container" />

      {/* Next project */}
      <div className="container pd-next reveal">
        <p className="pd-section-label">Next Project</p>
        <Link to={`/project/${nextProject.slug}`} className="pd-next-link">
          <div className="pd-next-content">
            <span className="pd-next-index">{nextProject.id}</span>
            <h2 className="pd-next-title">{nextProject.title}</h2>
            <p className="pd-next-sub">{nextProject.subtitle}</p>
          </div>
          <div className="pd-next-thumb" style={{ background: nextProject.gradient }} />
        </Link>
      </div>
    </motion.div>
  )
}
