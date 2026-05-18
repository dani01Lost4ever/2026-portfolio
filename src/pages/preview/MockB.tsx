import { Helmet } from 'react-helmet-async'
import { useHero, useProjects } from '../../context/ContentContext'
import PreviewShell from './PreviewShell'
import './preview.css'

function FlowDiagram() {
  return (
    <div className="pv-diagram-frame" aria-hidden>
      <svg className="pv-diagram" viewBox="0 0 300 380" preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="pv-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="300" height="380" fill="url(#pv-grid)" />

        {/* Node — DB */}
        <g>
          <ellipse cx="150" cy="70" rx="58" ry="20" fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="1.5" />
          <ellipse cx="150" cy="70" rx="58" ry="20" fill="rgba(255,255,255,0.04)" />
          <path d="M 92 70 a 58 8 0 0 0 116 0" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
          <path d="M 92 60 a 58 8 0 0 0 116 0" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <text x="150" y="74" textAnchor="middle" fill="rgba(255,255,255,0.95)"
                fontFamily="'JetBrains Mono', monospace" fontSize="11" letterSpacing="0.22em">DB</text>
        </g>

        {/* Connecting line — animated dash */}
        <line x1="150" y1="100" x2="150" y2="170"
              stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeDasharray="4 4">
          <animate attributeName="stroke-dashoffset" from="0" to="16" dur="0.9s" repeatCount="indefinite" />
        </line>

        {/* Node — API */}
        <g>
          <rect x="92" y="170" width="116" height="44" fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="1.5" rx="2" />
          <rect x="92" y="170" width="116" height="44" fill="rgba(255,255,255,0.04)" rx="2" />
          <text x="150" y="197" textAnchor="middle" fill="rgba(255,255,255,0.95)"
                fontFamily="'JetBrains Mono', monospace" fontSize="11" letterSpacing="0.22em">API</text>
          <text x="150" y="208" textAnchor="middle" fill="rgba(255,255,255,0.55)"
                fontFamily="'JetBrains Mono', monospace" fontSize="7" letterSpacing="0.2em">/HANDLER</text>
        </g>

        {/* Connecting line */}
        <line x1="150" y1="214" x2="150" y2="280"
              stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeDasharray="4 4">
          <animate attributeName="stroke-dashoffset" from="0" to="16" dur="1.1s" repeatCount="indefinite" />
        </line>

        {/* Node — UI */}
        <g>
          <rect x="64" y="280" width="172" height="68" fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="1.5" />
          <rect x="64" y="280" width="172" height="14" fill="rgba(255,255,255,0.16)" />
          <circle cx="74" cy="287" r="2.5" fill="rgba(255,255,255,0.85)" />
          <circle cx="84" cy="287" r="2.5" fill="rgba(255,255,255,0.55)" />
          <circle cx="94" cy="287" r="2.5" fill="rgba(255,255,255,0.55)" />
          <rect x="74" y="306" width="80" height="6" fill="rgba(255,255,255,0.42)" />
          <rect x="74" y="318" width="60" height="6" fill="rgba(255,255,255,0.28)" />
          <rect x="74" y="330" width="98" height="6" fill="rgba(255,255,255,0.28)" />
          <text x="150" y="358" textAnchor="middle" fill="rgba(255,255,255,0.95)"
                fontFamily="'JetBrains Mono', monospace" fontSize="11" letterSpacing="0.22em">UI</text>
        </g>

        {/* Corner ticks */}
        <g fill="rgba(255,255,255,0.5)" fontFamily="'JetBrains Mono', monospace" fontSize="7" letterSpacing="0.18em">
          <text x="14" y="18">01 / SCHEMA</text>
          <text x="14" y="370">04 / RENDER</text>
          <text x="220" y="18" textAnchor="end">DB → UI</text>
        </g>
      </svg>

      <div className="pv-diagram-label">
        <span>DB → API → UI</span>
        <span>Full-stack</span>
      </div>
    </div>
  )
}

export default function MockB() {
  const hero = useHero()
  const projects = useProjects()
  const topProjects = projects.slice(0, 5)

  return (
    <PreviewShell mock="b">
      <Helmet>
        <title>Preview B · Paper vermillion · {hero.name ?? 'Daniel'}</title>
      </Helmet>

      <div className="pv-shell">
        <div className="pv-container">
          <header className="pv-topbar">
            <div className="pv-mark">Daniel Busetto</div>
            <div className="pv-meta-row">
              <span><span className="pv-status-dot" />Available Q3</span>
              <span>Venice, IT</span>
              <span>2026 / 04</span>
            </div>
          </header>

          <section className="pv-hero">
            <div className="pv-hero-grid">
              <div>
                <div className="pv-eyebrow pv-reveal">
                  <span>A full-stack practice</span>
                  <span className="pv-eyebrow-rule" />
                </div>

                <h1 className="pv-display pv-display-serif pv-reveal" data-delay="1">
                  <span className="pv-display-line">Database</span>
                  <span className="pv-display-line indent">
                    to <span className="accent">interface.</span>
                  </span>
                </h1>

                <p className="pv-tagline pv-reveal" data-delay="3">
                  Daniel Busetto, full-stack developer based in Venice. <strong>Four years in, two companies, one obsession</strong>: shipping the whole stack and making the seam between API and UI disappear.
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
                <FlowDiagram />
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
                    <span className="cover" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <footer className="pv-foot">
            <span>© Daniel Busetto · 2026</span>
            <span>
              Preview B —{' '}
              <a href="https://fonts.google.com/specimen/Boldonse" target="_blank" rel="noreferrer">Boldonse</a>{' '}
              ·{' '}
              <a href="https://fonts.google.com/specimen/Onest" target="_blank" rel="noreferrer">Onest</a>{' '}
              · vermillion drench
            </span>
          </footer>
        </div>
      </div>
    </PreviewShell>
  )
}
