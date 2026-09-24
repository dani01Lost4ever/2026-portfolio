/**
 * ProjectDetail — a project's case study in the Field language.
 *
 * The header is a single field stop carrying the project's own shape and
 * tint, with the title beside it. Below: overview, challenge and solution
 * as long-form reading, the results, the architecture (tech cube + a plain
 * technology line), the link out, and previous/next project navigation.
 */

import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { incrementProjectViews } from '../lib/api'
import { useField } from '../field/useField'
import { TechCube } from '../field/techcube/TechCube'
import { ArrowLeft, ArrowRight, ArrowUpRight } from '../components/Icons'
import SiteFooter from '../components/SiteFooter'
import { projectBg, projectStopKey, stopAttrs } from '../components/fieldStops'
import { linkLabel, projectMeta } from '../components/projectMeta'
import { useOrderedProjects } from '../components/useOrderedProjects'

export default function ProjectDetail() {
  const { slug } = useParams()
  const { projects, visuals } = useOrderedProjects()
  const field = useField()

  const index = projects.findIndex(p => p.slug === slug)
  const project = index >= 0 ? projects[index] : undefined
  const projectSlug = project?.slug

  const [views, setViews] = useState<{ slug: string; count: number } | null>(null)
  const counted = useRef<string | null>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [slug])

  // Count one view per visit to a project (the ref keeps StrictMode's double effect from counting twice).
  useEffect(() => {
    if (!projectSlug || counted.current === projectSlug) return
    counted.current = projectSlug
    incrementProjectViews(projectSlug).then(v => {
      if (v > 0) setViews({ slug: projectSlug, count: v })
    })
  }, [projectSlug])

  useEffect(() => {
    field?.refresh()
  }, [field, projectSlug])

  if (!project) return <Navigate to="/" replace />

  const v = visuals[index]
  const key = projectStopKey(project)
  const prev = projects.length > 1 ? projects[(index - 1 + projects.length) % projects.length] : null
  const next = projects.length > 1 ? projects[(index + 1) % projects.length] : null
  const viewCount = views && views.slug === project.slug ? views.count : null

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

      <main id="main" tabIndex={-1} className="pd">
        <section
          className="pd-hero"
          id="top"
          aria-labelledby="pd-title"
          {...stopAttrs({ key, shape: v.shape, side: 'right', tint: v.tint, bg: projectBg(index) })}
        >
          <div className="copy pd-head">
            <Link to={`/#work-${project.slug}`} className="back">
              <ArrowLeft /> All work
            </Link>
            <p className="meta">{projectMeta(project).map((m, i) => <span key={i}>{m}</span>)}</p>
            <h1 id="pd-title" data-field-hover={key}>{project.title}</h1>
            <p className="sub">{project.subtitle}</p>
            <p className="desc">{project.description}</p>
            {facts.length > 0 && (
              <dl className="pd-facts">
                {facts.map(f => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}
              </dl>
            )}
            {project.link && (
              <a className="btn btn-primary" href={project.link} target="_blank" rel="noopener noreferrer" data-field-hover={key}>
                {linkLabel(project.link)}<span className="sr-only"> (opens in a new tab)</span> <ArrowUpRight />
              </a>
            )}
          </div>
          {v.caption && <p className="caption pd-cap">{v.caption}</p>}
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
              <dl className="results pd-results">
                {project.results.map(r => <div key={r.label}><dt>{r.value}</dt><dd>{r.label}</dd></div>)}
              </dl>
            </section>
          )}

          <section className="pd-section pd-arch" aria-labelledby="pd-arch">
            <div className="pd-arch-text">
              <h2 id="pd-arch">Architecture</h2>
              <ul className="pd-layers">
                {v.layers.map(l => (
                  <li key={l.label}><span className="pd-layer-label">{l.label}</span>{l.tech}</li>
                ))}
              </ul>
              {project.tags.length > 0 && (
                <p className="pd-stack"><span className="sr-only">Technologies: </span>{project.tags.join(' · ')}</p>
              )}
              {project.link && (
                <a className="link" href={project.link} target="_blank" rel="noopener noreferrer" data-field-hover={key}>
                  {linkLabel(project.link)}<span className="sr-only"> (opens in a new tab)</span> <ArrowUpRight />
                </a>
              )}
            </div>
            <div className="tech-cube-slot" data-field-hover={key}>
              <TechCube projects={[{ name: project.title, layers: v.layers }]} index={0} stopKey={key} tint={v.tint} />
            </div>
          </section>

          {prev && next && (
            <nav className="pd-nav" aria-label="More projects">
              <Link to={`/project/${prev.slug}`} className="pd-nav-link pd-prev" rel="prev">
                <span className="pd-nav-dir"><ArrowLeft /> Previous project</span>
                <span className="pd-nav-title">{prev.title}</span>
                <span className="pd-nav-sub">{prev.subtitle}</span>
              </Link>
              <Link to={`/project/${next.slug}`} className="pd-nav-link pd-next" rel="next">
                <span className="pd-nav-dir">Next project <ArrowRight /></span>
                <span className="pd-nav-title">{next.title}</span>
                <span className="pd-nav-sub">{next.subtitle}</span>
              </Link>
            </nav>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
