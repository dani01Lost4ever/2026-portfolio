/**
 * TakeDocument — the film's content as a plain document, in the film's order.
 *
 * Under the film it is visually hidden and carries no links (the film's own controls are the
 * way around), so screen readers and search engines get the words the film draws. With
 * reduced motion there is no film: it is the page, with links, and each section has the id
 * of its chapter so `/#contact` still lands.
 */

import { Link } from 'react-router-dom'
import ContactForm from '../components/ContactForm'
import type { TakeContent } from './engine/content'
import './take.css'

export default function TakeDocument({ c, interactive = false }: { c: TakeContent; interactive?: boolean }) {
  const lead = c.projects[0]
  const title = (p: TakeContent['projects'][number]) => interactive ? <Link to={`/project/${p.slug}`}>{p.title}</Link> : p.title
  return (
    <div className={interactive ? 'take-doc' : 'take-doc sr-only'}>
      <section id="top" aria-labelledby="doc-name" className="doc-open">
        <h1 id="doc-name">{c.fullName}<span className="doc-dot" aria-hidden="true" /></h1>
        <p className="doc-lede">{c.role}, {c.location}. {c.tagline}.</p>
      </section>

      <section id="work" aria-labelledby="doc-work">
        <h2 id="doc-work">Selected work</h2>
        <ul className="doc-work">
          {c.projects.map(p => (
            <li key={p.slug}>
              <span className="doc-n">{p.n} · {p.year}</span>
              <h3>{title(p)}</h3>
              <p>{p.sub}</p>
            </li>
          ))}
        </ul>
      </section>

      {lead && (
        <section id="case" aria-labelledby="doc-case">
          <h2 id="doc-case">Case study: {lead.title}</h2>
          <p className="doc-big">{lead.caption}</p>
          <p>{c.lead}</p>
          {lead.results.length > 0 && (
            <dl className="doc-res">{lead.results.map(r => <div key={r.label}><dt>{r.value}</dt><dd>{r.label}</dd></div>)}</dl>
          )}
          {interactive && <p><Link className="link" to={`/project/${lead.slug}`}>Read the full case study →</Link></p>}
        </section>
      )}

      <section id="now" aria-labelledby="doc-now">
        <h2 id="doc-now">Now</h2>
        <ul className="doc-list">
          {c.now.map(n => <li key={n.k}><span className="doc-n">{n.k.toLowerCase()}</span> {n.v}</li>)}
          {c.track && <li><span className="doc-n">now listening</span> {c.track.artist}, {c.track.title}</li>}
        </ul>
      </section>

      <section id="experience" aria-labelledby="doc-exp">
        <h2 id="doc-exp">Experience</h2>
        {c.expIntro && <p>{c.expIntro}</p>}
        <ul className="doc-list">
          {[...c.exp].reverse().map(r => <li key={r.a + r.b}><strong>{r.a}</strong> <span className="doc-n">{r.b}</span></li>)}
        </ul>
      </section>

      <section id="about" aria-labelledby="doc-about">
        <h2 id="doc-about">About</h2>
        {c.aboutHeading && <p className="doc-big">{c.aboutHeading}</p>}
        {c.aboutBody && <p>{c.aboutBody}</p>}
        <dl className="doc-stack">
          {c.stacks.map(s => <div key={s.n}><dt>{s.n}</dt><dd>{s.s}</dd></div>)}
        </dl>
      </section>

      <section id="contact" aria-labelledby="doc-contact">
        <h2 id="doc-contact">Contact</h2>
        {c.availability && <p>{c.availability}</p>}
        {interactive ? (
          <>
            <p><a className="link" href={`mailto:${c.email}`}>{c.email}</a>{c.github && <> · <a className="link" href={c.github} target="_blank" rel="noopener noreferrer">GitHub ↗</a></>}</p>
            <ContactForm />
          </>
        ) : (
          <p>{c.email}</p>
        )}
      </section>
    </div>
  )
}
