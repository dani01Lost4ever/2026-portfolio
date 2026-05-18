import { lazy, Suspense } from 'react'
import { Helmet } from 'react-helmet-async'
import { useHero, useProjects } from '../../context/ContentContext'
import PreviewShell from './PreviewShell'
import './preview.css'

const HeroScene = lazy(() => import('../../components/HeroScene'))

export default function MockA() {
  const hero = useHero()
  const projects = useProjects()
  const topProjects = projects.slice(0, 5)

  return (
    <PreviewShell mock="a">
      <Helmet>
        <title>Preview A · Warm-dark amber · {hero.name ?? 'Daniel'}</title>
      </Helmet>

      <div className="pv-shell">
        <div className="pv-container">
          <header className="pv-topbar">
            <div className="pv-mark">D.B.</div>
            <div className="pv-meta-row">
              <span><span className="pv-status-dot" />Available Q3</span>
              <span>Venice, IT</span>
              <span>v.04 · 2026</span>
            </div>
          </header>

          <section className="pv-hero">
            <div className="pv-scene-frame" aria-hidden>
              <Suspense fallback={null}>
                <HeroScene />
              </Suspense>
            </div>

            <div className="pv-hero-grid">
              <div>
                <div className="pv-eyebrow pv-reveal">
                  <span>Daniel Busetto · Full-stack developer</span>
                  <span className="pv-eyebrow-rule" />
                </div>

                <h1 className="pv-display pv-reveal" data-delay="1">
                  <span className="pv-display-line">Database</span>
                  <span className="pv-display-line indent">
                    to <span className="accent">interface,</span>
                  </span>
                  <span className="pv-display-line">built to scale.</span>
                </h1>

                <p className="pv-tagline pv-reveal" data-delay="3">
                  Four years in, two companies, one obsession: shipping the whole stack and making the seam between API and UI disappear.
                </p>

                <div className="pv-cta-row pv-reveal" data-delay="4">
                  <a className="pv-cta" href="#work">
                    See the work
                    <span className="pv-cta-arrow" aria-hidden>→</span>
                  </a>
                  <a className="pv-cta-ghost" href="mailto:daniel.busetto@venicecom.it">
                    daniel.busetto@venicecom.it
                  </a>
                </div>
              </div>

              <aside className="pv-hero-aside pv-reveal" data-delay="2">
                <div className="pv-aside-label">Index</div>
                <ul className="pv-aside-list">
                  <li><a href="#work"><span className="num">01</span><span className="title">Work</span><span className="meta">06 projects</span></a></li>
                  <li><a href="#about"><span className="num">02</span><span className="title">About</span><span className="meta">read</span></a></li>
                  <li><a href="#experience"><span className="num">03</span><span className="title">Experience</span><span className="meta">03 years</span></a></li>
                  <li><a href="#contact"><span className="num">04</span><span className="title">Contact</span><span className="meta">email</span></a></li>
                </ul>
              </aside>
            </div>
          </section>

          <section className="pv-work" id="work">
            <header className="pv-section-head">
              <span><span className="h-title">Selected work</span></span>
              <span>06 projects · 2023 — 2025</span>
            </header>

            <ul className="pv-work-list">
              {topProjects.map((p, i) => (
                <li key={p.id} className="pv-reveal" data-delay={String(Math.min(i + 1, 4))}>
                  <a className="pv-work-row" href={`/project/${p.slug}`}>
                    <span className="num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="title">{p.title}</span>
                    <span className="role">{p.role}</span>
                    <span className="year">{p.year}</span>
                    <span className="cover" style={{ background: p.gradient }} aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <footer className="pv-foot">
            <span>© Daniel Busetto · 2026</span>
            <span>
              Preview A —{' '}
              <a href="https://fonts.google.com/specimen/Bricolage+Grotesque" target="_blank" rel="noreferrer">Bricolage Grotesque</a>{' '}
              ·{' '}
              <a href="https://fonts.google.com/specimen/Funnel+Sans" target="_blank" rel="noreferrer">Funnel Sans</a>{' '}
              · amber persimmon
            </span>
          </footer>
        </div>
      </div>
    </PreviewShell>
  )
}
