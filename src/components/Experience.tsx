import { useExperience } from '../context/ContentContext'

export default function Experience() {
  const { work, education } = useExperience()
  return (
    <section className="experience section" id="experience">
      <div className="container">
        <p className="section-label reveal">Experience</p>

        <div className="exp-layout">
          {/* ── Work ── */}
          <div className="exp-col reveal d1">
            <p className="exp-col-label">Work</p>
            <div className="exp-work-list">
              {work.map((entry, ei) => (
                <div key={ei} className="exp-company-block">
                  <div className="exp-company-header">
                    <span className="exp-company-name">{entry.company}</span>
                    <span className="exp-company-duration">{entry.companyDuration}</span>
                  </div>

                  <div className="exp-roles">
                    {entry.roles.map((r, ri) => (
                      <div key={ri} className="exp-role">
                        <div className="exp-role-connector">
                          <div className="exp-role-dot" />
                          {ri < entry.roles.length - 1 && <div className="exp-role-line" />}
                        </div>
                        <div className="exp-role-body">
                          <div className="exp-role-header">
                            <span className="exp-role-title">{r.role}</span>
                            <span className="exp-role-type">{r.type}</span>
                          </div>
                          <span className="exp-role-period">
                            {r.period}
                            {r.location && ` · ${r.location}`}
                          </span>
                          <div className="exp-tags">
                            {r.tags.map(t => (
                              <span key={t} className="tag">{t}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Education ── */}
          <div className="exp-col reveal d2">
            <p className="exp-col-label">Education</p>
            <div className="exp-edu-list">
              {education.map((edu, i) => (
                <div key={i} className="exp-edu-item">
                  <div className="exp-edu-header">
                    <span className="exp-edu-school">{edu.school}</span>
                    {edu.grade && <span className="exp-edu-grade">{edu.grade}</span>}
                  </div>
                  <span className="exp-edu-degree">{edu.degree} · {edu.field}</span>
                  <span className="exp-edu-period">{edu.period}</span>
                  <div className="exp-tags">
                    {edu.tags.map(t => (
                      <span key={t} className="tag">{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
