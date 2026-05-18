/**
 * Work — typographic index.
 *
 * Each project is a row with: mono index, Boldonse title, mono role/stack,
 * mono year. On hover, the project's gradient cover slides in from the
 * right via clip-path, the title shifts to amber, and the row indents
 * slightly to acknowledge the input.
 */

import { Link } from 'react-router-dom'
import { useProjects } from '../context/ContentContext'

export default function Work() {
  const projects = useProjects()
  const firstYear = projects.reduce(
    (min, p) => (p.year < min ? p.year : min),
    projects[0]?.year ?? '',
  )
  const lastYear = projects.reduce(
    (max, p) => (p.year > max ? p.year : max),
    projects[0]?.year ?? '',
  )

  return (
    <section className="work section" id="work">
      <div className="container">
        <header className="work-head reveal">
          <span className="work-eyebrow">
            <span className="work-eyebrow-num">01</span>
            Selected work
          </span>
          <span className="work-rule" aria-hidden />
          <span className="work-meta">
            {String(projects.length).padStart(2, '0')} pieces · {firstYear} — {lastYear}
          </span>
        </header>

        <ul className="work-list">
          {projects.map((p, i) => (
            <li key={p.slug} className="reveal" style={{ transitionDelay: `${Math.min(i, 4) * 50}ms` }}>
              <Link to={`/project/${p.slug}`} className="work-row">
                <span className="work-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="work-title-cell">
                  <span className="work-title">{p.title}</span>
                  <span className="work-sub">{p.subtitle}</span>
                </span>
                <span className="work-role">{p.tags.slice(0, 2).join(' · ')}</span>
                <span className="work-year">{p.year}</span>
                <span
                  className="work-cover"
                  style={{ background: p.gradient }}
                  aria-hidden
                />
                <span className="work-arrow" aria-hidden>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
