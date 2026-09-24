import { Link } from 'react-router-dom'
import type { CubeLayer } from '../field/contract'
import { TechCube } from '../field/techcube/TechCube'
import type { Project } from '../lib/types'
import type { ProjectVisuals } from '../lib/projectVisuals'
import { ArrowRight, ArrowUpRight } from './Icons'
import { projectBg, projectStopKey, stopAttrs } from './fieldStops'
import { linkLabel, projectMeta } from './projectMeta'

interface Props {
  project: Project
  visuals: ProjectVisuals
  index: number
  /** Every project's cube data, in page order (the cube turns between them). */
  cubeProjects: { name: string; layers: CubeLayer[] }[]
}

export default function ProjectPanel({ project: p, visuals, index, cubeProjects }: Props) {
  const key = projectStopKey(p)
  const textSide = index % 2 === 0 ? 'left' : 'right'
  const titleId = `work-${p.slug}-title`

  return (
    <article
      className={`project text-${textSide}`}
      id={`work-${p.slug}`}
      aria-labelledby={titleId}
      {...stopAttrs({
        key,
        shape: visuals.shape,
        side: textSide === 'left' ? 'right' : 'left',
        tint: visuals.tint,
        bg: projectBg(index),
      })}
    >
      <div className="copy">
        {visuals.caption && <p className="caption">{visuals.caption}</p>}
        <p className="meta">{projectMeta(p).map((m, i) => <span key={i}>{m}</span>)}</p>
        <h3 id={titleId} data-field-hover={key}>
          <Link to={`/project/${p.slug}`} className="title-link">{p.title}</Link>
        </h3>
        <p className="sub">{p.subtitle}</p>
        <p className="desc">{p.description}</p>
        <div className="foot">
          <div className="foot-text">
            {p.results.length > 0 && (
              <dl className="results">
                {p.results.map(r => (
                  <div key={r.label}><dt>{r.value}</dt><dd>{r.label}</dd></div>
                ))}
              </dl>
            )}
            <div className="links">
              <Link className="link" to={`/project/${p.slug}`} data-field-hover={key}>
                Case study<span className="sr-only">: {p.title}</span> <ArrowRight />
              </Link>
              {p.link && (
                <a className="link" href={p.link} target="_blank" rel="noopener noreferrer" data-field-hover={key}>
                  {linkLabel(p.link)}<span className="sr-only"> for {p.title} (opens in a new tab)</span> <ArrowUpRight />
                </a>
              )}
            </div>
          </div>
          <div className="tech-cube-slot" data-field-hover={key}>
            <TechCube projects={cubeProjects} index={index} stopKey={key} tint={visuals.tint} />
          </div>
        </div>
        <ul className="sr-only" aria-label={`${p.title} architecture, top to bottom`}>
          {visuals.layers.map(l => <li key={l.label}>{l.label}: {l.tech}</li>)}
        </ul>
      </div>
    </article>
  )
}
