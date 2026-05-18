import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useHero, useProjects } from '../../context/ContentContext'
import PreviewShell from './PreviewShell'
import './preview.css'

type Theme = 'light' | 'dark'

function FlowDiagram({ theme }: { theme: Theme }) {
  const isDark = theme === 'dark'
  const stroke = isDark ? 'rgba(20,18,15,0.92)' : 'rgba(255,253,248,0.92)'
  const strokeSoft = isDark ? 'rgba(20,18,15,0.55)' : 'rgba(255,253,248,0.55)'
  const fillSoft = isDark ? 'rgba(20,18,15,0.06)' : 'rgba(255,253,248,0.05)'
  const dot = isDark ? 'rgba(20,18,15,0.85)' : 'rgba(255,253,248,0.85)'
  const gridStroke = isDark ? 'rgba(20,18,15,0.16)' : 'rgba(255,253,248,0.12)'

  return (
    <div className="pv-diagram-frame" aria-hidden>
      <svg className="pv-diagram" viewBox="0 0 300 380" preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="pv-grid-c" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke={gridStroke} strokeWidth="1" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="300" height="380" fill="url(#pv-grid-c)" />

        <g>
          <ellipse cx="150" cy="70" rx="58" ry="20" fill="none" stroke={stroke} strokeWidth="1.5" />
          <ellipse cx="150" cy="70" rx="58" ry="20" fill={fillSoft} />
          <path d="M 92 70 a 58 8 0 0 0 116 0" fill="none" stroke={strokeSoft} strokeWidth="1.5" />
          <path d="M 92 60 a 58 8 0 0 0 116 0" fill="none" stroke={strokeSoft} strokeWidth="1" />
          <text x="150" y="74" textAnchor="middle" fill={stroke}
                fontFamily="'JetBrains Mono', monospace" fontSize="11" letterSpacing="0.22em">DB</text>
        </g>

        <line x1="150" y1="100" x2="150" y2="170"
              stroke={stroke} strokeWidth="1.5" strokeDasharray="4 4">
          <animate attributeName="stroke-dashoffset" from="0" to="16" dur="0.9s" repeatCount="indefinite" />
        </line>

        <g>
          <rect x="92" y="170" width="116" height="44" fill="none" stroke={stroke} strokeWidth="1.5" rx="2" />
          <rect x="92" y="170" width="116" height="44" fill={fillSoft} rx="2" />
          <text x="150" y="197" textAnchor="middle" fill={stroke}
                fontFamily="'JetBrains Mono', monospace" fontSize="11" letterSpacing="0.22em">API</text>
          <text x="150" y="208" textAnchor="middle" fill={strokeSoft}
                fontFamily="'JetBrains Mono', monospace" fontSize="7" letterSpacing="0.2em">/HANDLER</text>
        </g>

        <line x1="150" y1="214" x2="150" y2="280"
              stroke={stroke} strokeWidth="1.5" strokeDasharray="4 4">
          <animate attributeName="stroke-dashoffset" from="0" to="16" dur="1.1s" repeatCount="indefinite" />
        </line>

        <g>
          <rect x="64" y="280" width="172" height="68" fill="none" stroke={stroke} strokeWidth="1.5" />
          <rect x="64" y="280" width="172" height="14" fill={strokeSoft} />
          <circle cx="74" cy="287" r="2.5" fill={dot} />
          <circle cx="84" cy="287" r="2.5" fill={strokeSoft} />
          <circle cx="94" cy="287" r="2.5" fill={strokeSoft} />
          <rect x="74" y="306" width="80" height="6" fill={strokeSoft} />
          <rect x="74" y="318" width="60" height="6" fill={strokeSoft} opacity="0.6" />
          <rect x="74" y="330" width="98" height="6" fill={strokeSoft} opacity="0.6" />
          <text x="150" y="358" textAnchor="middle" fill={stroke}
                fontFamily="'JetBrains Mono', monospace" fontSize="11" letterSpacing="0.22em">UI</text>
        </g>

        <g fill={strokeSoft} fontFamily="'JetBrains Mono', monospace" fontSize="7" letterSpacing="0.18em">
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

export default function MockC() {
  const hero = useHero()
  const projects = useProjects()
  const topProjects = projects.slice(0, 5)
  const [theme, setTheme] = useState<Theme>('dark')

  // Sync data-theme onto the .preview-c wrapper rendered by PreviewShell,
  // so cursor / shell styles can react too.
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('.preview-c')
    if (el) el.setAttribute('data-theme', theme)
    return () => {
      const el2 = document.querySelector<HTMLElement>('.preview-c')
      if (el2) el2.removeAttribute('data-theme')
    }
  }, [theme])

  return (
    <PreviewShell mock="c">
      <Helmet>
        <title>Preview C · Editorial dual-mode · {hero.name ?? 'Daniel'}</title>
      </Helmet>

      <div className="pv-c-themed" data-theme={theme}>
        <div className="pv-shell">
          <div className="pv-container">
            <header className="pv-topbar">
              <div className="pv-mark">Daniel Busetto</div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 2vw, 24px)' }}>
                <div className="pv-meta-row">
                  <span><span className="pv-status-dot" />Available Q3</span>
                  <span>Venice, IT</span>
                </div>

                <button
                  type="button"
                  className="pv-theme-switch"
                  onClick={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}
                  aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
                  aria-pressed={theme === 'dark'}
                >
                  <span className="pv-theme-glyph" aria-hidden />
                  {theme === 'light' ? 'Dark' : 'Light'}
                </button>
              </div>
            </header>

            <section className="pv-hero">
              <div className="pv-hero-grid">
                <div>
                  <div className="pv-eyebrow pv-reveal">
                    <span>Serif on warm-dark · flip to paper anytime</span>
                    <span className="pv-eyebrow-rule" />
                  </div>

                  <h1 className="pv-display pv-display-serif pv-reveal" data-delay="1">
                    <span className="pv-display-line">Database</span>
                    <span className="pv-display-line indent">
                      to <span className="accent">interface.</span>
                    </span>
                  </h1>

                  <p className="pv-tagline pv-reveal" data-delay="3">
                    Daniel Busetto, full-stack developer based in Venice. <strong>Four years in, two companies, one obsession</strong>: shipping the whole stack and making the seam between API and UI disappear. Same Boldonse typography, two moods. Use the switcher in the top bar.
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
                  <FlowDiagram theme={theme} />
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
                Preview C — editorial dual-mode ·{' '}
                <a href="https://fonts.google.com/specimen/Boldonse" target="_blank" rel="noreferrer">Boldonse</a>{' '}
                ·{' '}
                <a href="https://fonts.google.com/specimen/Onest" target="_blank" rel="noreferrer">Onest</a>{' '}
                · light + warm-dark
              </span>
            </footer>
          </div>
        </div>
      </div>
    </PreviewShell>
  )
}
