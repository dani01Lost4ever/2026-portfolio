import { Fragment } from 'react'
import { useExperience } from '../context/content-hooks'
import { STOP_BG, capitalise, numberWord, stopAttrs } from './fieldStops'

function plural(n: number, one: string, many = `${one}s`) {
  return n === 1 ? one : many
}

export default function Experience() {
  const { work, education } = useExperience()

  const roleCount = work.reduce((n, w) => n + w.roles.length, 0)
  const rings = roleCount + education.length
  const honours = education.filter(e => /cum laude/i.test(e.grade ?? '')).length

  const companies = work.length === 1 ? 'one company' : `${numberWord(work.length)} companies`
  const heading =
    `${capitalise(numberWord(roleCount))} ${plural(roleCount, 'role')} at ${companies}` +
    (honours ? `, ${numberWord(honours)} ${plural(honours, 'diploma')} cum laude.` : '.')

  // one running, 1-based ring number across roles and schools: ring 1 is the newest role, at the top of the helix
  let ring = 0

  return (
    <section
      className="exp"
      id="experience"
      aria-labelledby="exp-title"
      {...stopAttrs({ key: 'helix', shape: 'helix', side: 'right', bg: STOP_BG.helix, rings })}
    >
      <div className="exp-head">
        <p className="kicker">Experience and education</p>
        <h2 id="exp-title">{heading}</h2>
        <p className="caption exp-cap">A timeline that rises: every ring is a role or a school.</p>
      </div>

      <div className="exp-list">
        {work.map(w => (
          <Fragment key={w.company}>
            <h3 className="exp-group">
              {w.company}{w.companyDuration && <>, {w.companyDuration}</>}
            </h3>
            {w.roles.map(r => {
              const where = [r.type, r.location].filter(Boolean).join(', ')
              return (
                <div className="entry" key={`${r.role}-${r.period}`} data-marker data-field-ring={++ring}>
                  <p className="period">{r.period}</p>
                  <h4>{r.role}</h4>
                  {where && <p className="where">{where}</p>}
                  {r.tags.length > 0 && (
                    <p className="tech"><span className="sr-only">Technologies: </span>{r.tags.join(' · ')}</p>
                  )}
                </div>
              )
            })}
          </Fragment>
        ))}

        {education.length > 0 && <h3 className="exp-group">Education</h3>}
        {education.map(e => {
          const where = [e.field, e.degree, e.grade].filter(Boolean).join(', ')
          return (
            <div className="entry" key={`${e.school}-${e.period}`} data-marker data-field-ring={++ring}>
              <p className="period">{e.period}</p>
              <h4>{e.school}</h4>
              {where && <p className="where">{where}</p>}
            </div>
          )
        })}
      </div>
    </section>
  )
}
