/**
 * Experience — editorial timeline.
 *
 * Single typographic ledger that lists work and education as parallel
 * rails sharing the same row grammar: mono period on the left, Boldonse
 * role/school in the middle, mono location/grade on the right. A subtle
 * vertical rule between the two tracks. No timeline dots competing with
 * the type — the rhythm of the rows IS the timeline.
 */

import { useExperience } from '../context/ContentContext'

export default function Experience() {
  const { work, education } = useExperience()

  return (
    <section className="experience section" id="experience">
      <div className="container">
        <header className="exp-head reveal">
          <span className="exp-eyebrow">
            <span className="exp-eyebrow-num">04</span>
            Experience &amp; education
          </span>
          <span className="exp-rule" aria-hidden />
          <span className="exp-meta">2020 — Present</span>
        </header>

        {/* ── Work track ── */}
        <div className="exp-track reveal d1">
          <h3 className="exp-track-heading">
            <span className="exp-track-num">a</span>
            Work
          </h3>

          <ol className="exp-list">
            {work.flatMap(company =>
              company.roles.map((role, ri) => (
                <li key={`${company.company}-${ri}`} className="exp-row">
                  <span className="exp-row-period">{role.period}</span>
                  <span className="exp-row-main">
                    <span className="exp-row-title">{role.role}</span>
                    <span className="exp-row-org">
                      {company.company}
                      {role.type && <span className="exp-row-type"> · {role.type}</span>}
                    </span>
                    <span className="exp-row-tags">
                      {role.tags.slice(0, 6).join(' · ')}
                      {role.tags.length > 6 && <span className="exp-row-more"> · +{role.tags.length - 6}</span>}
                    </span>
                  </span>
                  <span className="exp-row-side">{role.location || '—'}</span>
                </li>
              )),
            )}
          </ol>
        </div>

        {/* ── Education track ── */}
        <div className="exp-track reveal d2">
          <h3 className="exp-track-heading">
            <span className="exp-track-num">b</span>
            Education
          </h3>

          <ol className="exp-list">
            {education.map((edu, i) => (
              <li key={i} className="exp-row">
                <span className="exp-row-period">{edu.period}</span>
                <span className="exp-row-main">
                  <span className="exp-row-title">{edu.school}</span>
                  <span className="exp-row-org">
                    {edu.degree} · {edu.field}
                  </span>
                  <span className="exp-row-tags">
                    {edu.tags.slice(0, 6).join(' · ')}
                    {edu.tags.length > 6 && <span className="exp-row-more"> · +{edu.tags.length - 6}</span>}
                  </span>
                </span>
                <span className="exp-row-side">
                  {edu.grade ? <span className="exp-row-grade">{edu.grade}</span> : '—'}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
