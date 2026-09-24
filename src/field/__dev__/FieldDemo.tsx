/* Temporary harness page for src/field (field-dev.html). Remove at integration. */
import { useEffect, useState } from 'react'
import type { ShapeId } from '../contract'
import { useField } from '../useField'
import projectsJson from '../../data/projects.json'
import aboutJson from '../../data/about.json'
import experienceJson from '../../data/experience.json'

interface ProjectLite {
  slug: string
  year: string
  title: string
  subtitle: string
  description: string
  gradient: string
  results: { value: string; label: string }[]
  link?: string
}

const projects = projectsJson as ProjectLite[]

const SHAPE_BY_SLUG: Record<string, ShapeId> = {
  bugpilot: 'bug',
  'the-loop': 'loop',
  'stellar-freight-co': 'orbit',
  auroratrader: 'candles',
  'cloudflare-ddns-client': 'globe',
  'agendash-3': 'clocks',
  'openai-cost-calculator': 'coins',
  'original-portfolio': 'browser',
  'tictactoe-ai': 'tictactoe',
  'battleship-ai': 'battleship',
}
/** The approved design's page gradients for the original six; the new four use registry defaults. */
const BG_BY_SLUG: Record<string, string> = {
  bugpilot: '#0B3B3D,#04181C',
  'the-loop': '#0C3447,#041722',
  'stellar-freight-co': '#132D50,#060F22',
  auroratrader: '#0D3B37,#041915',
  'cloudflare-ddns-client': '#0B3350,#04121F',
  'agendash-3': '#103A45,#051920',
}
/** Design overrides where the raw gradient reads badly as a point tint. */
const TINT_BY_SLUG: Record<string, string> = {
  'the-loop': '#EEF0F4,#A9B1C2',
  'stellar-freight-co': '#a78bfa,#6366f1',
}

const hexes = (g: string): string => {
  const m = g.match(/#[0-9a-f]{6}/gi) ?? []
  return m.length ? `${m[0]},${m[m.length - 1]}` : ''
}

function Project({ p, k, shape }: { p: ProjectLite; k: number; shape: string }) {
  const key = `project:${p.slug}`
  return (
    <article
      className="project"
      id={p.slug}
      data-field-stop={key}
      data-shape={shape}
      data-side={k % 2 === 0 ? 'right' : 'left'}
      data-tint={TINT_BY_SLUG[p.slug] ?? hexes(p.gradient)}
      data-bg={BG_BY_SLUG[p.slug]}
    >
      <div className="copy">
        <p className="meta">{p.year} · {shape}</p>
        <h3 data-field-hover={key}>{p.title}</h3>
        <p className="sub">{p.subtitle}</p>
        <p className="desc">{p.description.slice(0, 260)}…</p>
        <div className="foot">
          <div>
            <dl className="results">
              {p.results.slice(0, 3).map((r) => (
                <div key={r.label}><dt>{r.value}</dt><dd>{r.label}</dd></div>
              ))}
            </dl>
            {p.link ? <a className="link" href={p.link} data-field-hover={key}>Visit</a> : null}
          </div>
          <div className="cube-slot" data-field-hover={key}>tech cube</div>
        </div>
      </div>
    </article>
  )
}

function Home({ late }: { late: boolean }) {
  const exp = experienceJson
  const entries = [
    ...exp.work.flatMap((w) => w.roles.map((r) => ({ period: r.period, title: r.role, where: `${w.company}, ${r.type}` }))),
    ...exp.education.map((e) => ({ period: e.period, title: e.school, where: `${e.degree}, ${e.field}` })),
  ]
  return (
    <main>
      <section className="hero" id="top" data-field-stop="hero" data-shape="grid" data-side="center" data-bg="#0E4148,#031A1F">
        <div className="hero-inner">
          <h1><span>From database</span><span>to interface,</span><span>built to scale.</span></h1>
          <p className="hero-sub">Field harness: every stop kind, real project data. Click empty space for shockwaves, drag to rotate.</p>
        </div>
      </section>

      <section id="work">
        <header className="work-intro">
          <p className="kicker">Selected work</p>
          <h2>Ten projects, each with its own shape.</h2>
        </header>
        {projects.map((p, k) => <Project key={p.slug} p={p} k={k} shape={SHAPE_BY_SLUG[p.slug] ?? 'constellation'} />)}
        {late ? (
          <Project
            p={{ slug: 'future-project', year: '2027', title: 'Future project', subtitle: 'Unknown shape falls back to a constellation.', description: 'This stop is added 1.2 s after mount to exercise the MutationObserver path and the fallback shape. ', gradient: '#74ebd5,#9face6', results: [{ value: '?', label: 'Not built yet' }] }}
            k={projects.length}
            shape="something-new"
          />
        ) : null}
      </section>

      <section id="about">
        <div className="about-intro">
          <div><p className="kicker">About</p><h2>{aboutJson.heading}</h2></div>
          <div className="bio">{aboutJson.bio.map((b) => <p key={b.slice(0, 16)}>{b.slice(0, 180)}</p>)}</div>
        </div>
        <div className="stack" data-field-stop="about" data-shape="clusters" data-cluster-sizes={aboutJson.skills.map((s) => s.items.length).join(',')} data-bg="#2B1639,#110A1C">
          {aboutJson.skills.map((s, gi) => (
            <div className="group" key={s.category} data-field-cluster={gi + 1}>
              <div className="spot" data-field-spot aria-hidden="true" />
              <div>
                <h3>{s.category}</h3>
                <p className="count">{s.items.length} skills</p>
                <ul>{s.items.map((it) => <li key={it}>{it}</li>)}</ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="exp" id="experience" data-field-stop="experience" data-shape="helix" data-rings={entries.length} data-bg="#231B3E,#0A1321">
        <div className="exp-head">
          <p className="kicker">Experience and education</p>
          <h2>Three roles at one company, one diploma cum laude.</h2>
        </div>
        <div className="exp-list">
          {entries.map((e, ei) => (
            <div className="entry" key={e.title + e.period} data-field-ring={ei + 1}>
              <p className="period">{e.period}</p>
              <h3>{e.title}</h3>
              <p className="where">{e.where}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="contact" id="contact" data-field-stop="contact" data-shape="at" data-side="right" data-bg="#0B4245,#031C1E">
        <div className="contact-inner">
          <p className="kicker">Contact</p>
          <h2>Let's build something great together.</h2>
          <p className="avail">Currently open to freelance projects and full-time opportunities.</p>
        </div>
        <footer><span>© 2026 Daniel Busetto.</span><a href="#top">Back to top</a></footer>
      </section>
    </main>
  )
}

function Detail({ slug }: { slug: string }) {
  const p = projects.find((x) => x.slug === slug) ?? projects[0]
  const shape = SHAPE_BY_SLUG[p.slug] ?? 'constellation'
  return (
    <main>
      <article className="detail" data-field-stop={`project:${p.slug}`} data-shape={shape} data-side="right" data-tint={TINT_BY_SLUG[p.slug] ?? hexes(p.gradient)}>
        <div className="copy">
          <p className="meta">{p.year} · detail · {shape}</p>
          <h1 style={{ fontSize: 'clamp(2.4rem,5vw,4.6rem)' }}>{p.title}</h1>
          <p className="sub">{p.subtitle}</p>
        </div>
      </article>
      <div className="detail-body"><p>{p.description}</p></div>
    </main>
  )
}

export function FieldDemo() {
  const params = new URLSearchParams(window.location.search)
  const [view, setView] = useState<string>(params.get('detail') ?? '')
  const [late, setLate] = useState(false)
  const [p, setP] = useState(0)
  const field = useField()

  useEffect(() => {
    const id = window.setTimeout(() => setLate(true), 1200)
    return () => window.clearTimeout(id)
  }, [])
  useEffect(() => {
    if (!field) return
    ;(window as unknown as { __field?: unknown }).__field = field
    return field.onProgress((v) => setP(v))
  }, [field])

  const go = (v: string): void => {
    setView(v)
    window.scrollTo(0, 0)
  }

  return (
    <>
      <nav className="nav" aria-label="Primary">
        <a className="logo" href="#top">DB</a>
        <ul>
          <li><a href="#work">Work</a></li>
          <li><a href="#about">About</a></li>
          <li className="hide-s"><a href="#experience">Experience</a></li>
          <li className="hide-s">
            <button type="button" onClick={() => go(view ? '' : 'battleship-ai')}>{view ? 'Home' : 'Detail'}</button>
          </li>
          <li><a className="btn" href="#contact">Contact</a></li>
        </ul>
      </nav>
      {view ? <Detail slug={view} /> : <Home late={late} />}
      <div className="dev-hud">p {p.toFixed(2)} · {field?.isStatic ? 'static' : 'webgl'}</div>
    </>
  )
}
