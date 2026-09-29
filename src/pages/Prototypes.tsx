/**
 * Prototypes — the gallery of site prototypes (src/data/prototypes.json).
 *
 * A wordmark like the 404's, one line of intro, then a card per prototype: its
 * screenshot in a browser window, the meta line, title, description and stack.
 * The whole card opens the prototype's page, where it runs live; its last link
 * opens the prototype itself in a new tab.
 */

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { usePrototypes } from '../context/content-hooks'
import { displayUrl, listPrototypes, prototypeNumber, prototypePath } from '../lib/prototypes'
import type { Prototype } from '../lib/types'
import { ArrowUpRight } from '../components/Icons'
import { cmsText } from '../components/content'
import PageHeader from '../components/PageHeader'
import { BrowserBar, PrototypeShot } from '../components/PrototypeFrame'
import SiteFooter from '../components/SiteFooter'

/** "2026", or "2024 — 26" when they span years. */
function yearSpan(list: Prototype[]): string {
  const years = list.map(p => parseInt(p.year, 10)).filter(y => Number.isFinite(y))
  if (!years.length) return ''
  const a = Math.min(...years), b = Math.max(...years)
  return a === b ? String(a) : `${a} — ${String(b).slice(2)}`
}

export default function Prototypes() {
  const { intro, items } = usePrototypes()
  const list = useMemo(() => listPrototypes(items), [items])
  const lede = cmsText(intro)
  const years = yearSpan(list)
  const description = lede || 'Site prototypes by Daniel Busetto: working pages to open, resize and scroll.'

  return (
    <>
      <Helmet>
        <title>Prototypes, by Daniel Busetto</title>
        <meta name="description" content={description} />
        <meta property="og:title" content="Prototypes, by Daniel Busetto" />
        <meta property="og:description" content={description} />
      </Helmet>

      <PageHeader />

      <main id="main" tabIndex={-1} className="pg">
        <section className="pg-hero" id="top" aria-labelledby="pg-title">
          <p className="pd-kicker">
            <span>Prototypes</span>
            <span>{list.length === 1 ? '1 site' : `${list.length} sites`}</span>
            {years && <span>{years}</span>}
          </p>
          <h1 id="pg-title" className="pg-word">prototypes<span className="nf-dot" aria-hidden="true" /></h1>
          {lede && <p className="pg-lede">{lede}</p>}
        </section>

        {list.length > 0 ? (
          <ol className="pg-grid">
            {list.map((p, i) => (
              <li key={p.slug}>
                <PrototypeCard p={p} n={prototypeNumber(i)} />
              </li>
            ))}
          </ol>
        ) : (
          <p className="pg-empty">Nothing here yet. The first prototype is on its way.</p>
        )}
      </main>

      <SiteFooter />
    </>
  )
}

function PrototypeCard({ p, n }: { p: Prototype; n: string }) {
  const titleId = `pg-${p.slug}`
  return (
    <article className="pg-card" aria-labelledby={titleId}>
      <div className="pf">
        <BrowserBar url={displayUrl(p.url) || p.slug} />
        <PrototypeShot p={p} className="pg-shot" />
      </div>
      <div className="pg-text">
        <div className="pg-meta">
          <p className="pd-kicker">{[n, p.year, p.kind].filter(Boolean).map((m, i) => <span key={i}>{m}</span>)}</p>
          {p.status && <span className="pg-status">{p.status}</span>}
        </div>
        <h2 className="pg-title" id={titleId}>
          <Link to={prototypePath(p)} className="pg-open">{p.title}</Link>
        </h2>
        {p.description && <p className="pg-desc">{p.description}</p>}
        <div className="pg-foot">
          {p.stack.length > 0 && (
            <ul className="pd-tags" aria-label="Built with">
              {p.stack.map(t => <li key={t}>{t}</li>)}
            </ul>
          )}
          {p.url && (
            <a className="link pg-ext" href={p.url} target="_blank" rel="noopener noreferrer">
              Open it<span className="sr-only"> in a new tab</span> <ArrowUpRight />
            </a>
          )}
        </div>
      </div>
    </article>
  )
}
