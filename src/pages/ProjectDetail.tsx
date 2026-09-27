/**
 * ProjectDetail — a project's case study in the One Take language.
 *
 * The hero sets the title and facts beside the project's poster. Below:
 * overview, challenge and solution as long-form reading, the results, the
 * architecture as ruled layer rows with the tags, and previous/next project
 * cards.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useProjects } from '../context/content-hooks'
import { incrementProjectViews } from '../lib/api'
import { visualsFor } from '../lib/projectVisuals'
import { Poster } from '../take/Poster'
import { ArrowLeft, ArrowRight, ArrowUpRight } from '../components/Icons'
import PageHeader from '../components/PageHeader'
import SiteFooter from '../components/SiteFooter'
import { linkLabel, projectMeta } from '../components/projectMeta'

export default function ProjectDetail() {
  const { slug } = useParams()
  const allProjects = useProjects()
  const projects = useMemo(() => [...allProjects].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [allProjects])

  const index = projects.findIndex(p => p.slug === slug)
  const project = index >= 0 ? projects[index] : undefined
  const projectSlug = project?.slug

  const [views, setViews] = useState<{ slug: string; count: number } | null>(null)
  const counted = useRef<string | null>(null)

  // Count one view per visit to a project (the ref keeps StrictMode's double effect from counting twice).
  useEffect(() => {
    if (!projectSlug || counted.current === projectSlug) return
    counted.current = projectSlug
    incrementProjectViews(projectSlug).then(v => {
      if (v > 0) setViews({ slug: projectSlug, count: v })
    })
  }, [projectSlug])

  if (!project) return <Navigate to="/" replace />

  const v = visualsFor(project)
  const prev = projects.length > 1 ? projects[(index - 1 + projects.length) % projects.length] : null
  const next = projects.length > 1 ? projects[(index + 1) % projects.length] : null
  const viewCount = views && views.slug === project.slug ? views.count : null
  const meta = [project.id, ...projectMeta(project)].filter(Boolean)

  const facts = [
    { label: 'Role', value: project.role },
    { label: 'Timeline', value: project.timeline },
    { label: 'Year', value: project.year },
    ...(viewCount !== null ? [{ label: 'Views', value: viewCount.toLocaleString('en') }] : []),
  ].filter(f => f.value)

  const longform = [
    { id: 'overview', title: 'Overview', body: project.overview },
    { id: 'challenge', title: 'The challenge', body: project.challenge },
    { id: 'solution', title: 'The solution', body: project.solution },
  ].filter(s => s.body)

  return (
    <>
      <Helmet>
        <title>{`${project.title}, a case study by Daniel Busetto`}</title>
        <meta name="description" content={project.description} />
        <meta property="og:title" content={`${project.title}, a case study`} />
        <meta property="og:description" content={project.description} />
      </Helmet>

      <PageHeader />

      <main id="main" tabIndex={-1} className="pd">
        <section className="pd-hero" id="top" aria-labelledby="pd-title">
          <div className="pd-head">
            <Link to="/#work" className="pd-back">
              <ArrowLeft /> All work
            </Link>
            <p className="pd-kicker">{meta.map((m, i) => <span key={i}>{m}</span>)}</p>
            <h1 id="pd-title" className="pd-title">{project.title}</h1>
            <p className="pd-sub">{project.subtitle}</p>
            <p className="pd-desc">{project.description}</p>
            {facts.length > 0 && (
              <dl className="pd-facts">
                {facts.map(f => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}
              </dl>
            )}
            {project.link && (
              <a className="btn btn-primary" href={project.link} target="_blank" rel="noopener noreferrer">
                {linkLabel(project.link)}<span className="sr-only"> (opens in a new tab)</span> <ArrowUpRight />
              </a>
            )}
          </div>
          <figure className="pd-poster">
            <Poster shape={v.shape} className="pd-poster-art" />
            {v.caption && <figcaption className="pd-caption">{v.caption}</figcaption>}
          </figure>
        </section>

        <div className="pd-body">
          {longform.map(s => (
            <section key={s.id} className="pd-section" aria-labelledby={`pd-${s.id}`}>
              <h2 id={`pd-${s.id}`}>{s.title}</h2>
              <p>{s.body}</p>
            </section>
          ))}

          {project.results.length > 0 && (
            <section className="pd-section" aria-labelledby="pd-results">
              <h2 id="pd-results">Results</h2>
              <dl className="pd-results">
                {project.results.map(r => <div key={r.label}><dt>{r.value}</dt><dd>{r.label}</dd></div>)}
              </dl>
            </section>
          )}

          <section className="pd-section" aria-labelledby="pd-arch">
            <h2 id="pd-arch">Architecture</h2>
            <ul className="pd-layers">
              {v.layers.map(l => (
                <li key={l.label}><span className="pd-layer-label">{l.label}</span><span className="pd-layer-tech">{l.tech}</span></li>
              ))}
            </ul>
            {project.tags.length > 0 && (
              <ul className="pd-tags" aria-label="Technologies">
                {project.tags.map(t => <li key={t}>{t}</li>)}
              </ul>
            )}
          </section>

          {prev && next && (
            <nav className="pd-nav" aria-label="More projects">
              <Link to={`/project/${prev.slug}`} className="pd-card" rel="prev">
                <Poster shape={visualsFor(prev).shape} className="pd-card-poster" />
                <span className="pd-card-text">
                  <span className="pd-card-dir"><ArrowLeft /> Previous project</span>
                  <span className="pd-card-title">{prev.title}</span>
                  <span className="pd-card-sub">{prev.subtitle}</span>
                </span>
              </Link>
              <Link to={`/project/${next.slug}`} className="pd-card" rel="next">
                <Poster shape={visualsFor(next).shape} className="pd-card-poster" />
                <span className="pd-card-text">
                  <span className="pd-card-dir">Next project <ArrowRight /></span>
                  <span className="pd-card-title">{next.title}</span>
                  <span className="pd-card-sub">{next.subtitle}</span>
                </span>
              </Link>
            </nav>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
