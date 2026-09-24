import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import type { CubeLayer } from '../field/contract'
import { TechCube } from '../field/techcube/TechCube'
import { useField } from '../field/useField'
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

function smoothstep(a: number, b: number, v: number) {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/**
 * Desktop only: fade a project's caption with its shape, so it is fully shown while the shape
 * rests and gone while the field morphs to the next stop (it never drifts over another shape).
 */
function useCaptionFade(key: string) {
  const ref = useRef<HTMLParagraphElement>(null)
  const field = useField()

  useEffect(() => {
    const el = ref.current
    if (!field || !el || field.isStatic) return
    const mq = window.matchMedia('(max-width: 900px)')
    let last = -1
    const apply = (p: number) => {
      const k = field.stopIndex(key)
      let vis = 1
      if (!mq.matches && k >= 0) {
        const d = p - k
        vis = d >= 0 ? 1 - smoothstep(0, 0.18, d) : smoothstep(-0.18, 0, d)
      }
      vis = Math.round(vis * 50) / 50
      if (vis !== last) {
        last = vis
        el.style.opacity = String(vis)
      }
    }
    const onMq = () => apply(field.getProgress())
    apply(field.getProgress())
    const off = field.onProgress(apply)
    mq.addEventListener('change', onMq)
    return () => {
      off()
      mq.removeEventListener('change', onMq)
      el.style.opacity = ''
    }
  }, [field, key])

  return ref
}

export default function ProjectPanel({ project: p, visuals, index, cubeProjects }: Props) {
  const key = projectStopKey(p)
  const textSide = index % 2 === 0 ? 'left' : 'right'
  const titleId = `work-${p.slug}-title`
  const captionRef = useCaptionFade(key)

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
        {visuals.caption && (
          // desktop: the rail spans the shape's column, and the caption sticks under the shape while the panel is read
          <div className="cap-rail"><p className="caption" ref={captionRef}>{visuals.caption}</p></div>
        )}
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
