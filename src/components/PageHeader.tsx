/**
 * PageHeader — the sticky header of every page but the film, set like the film's
 * chrome: the wordmark and role back to the home page on the left (the db. mark
 * on narrow screens), the CMS nav on the right, its last item lit.
 */

import { Link } from 'react-router-dom'
import { useAbout, useHero, useSite } from '../context/content-hooks'
import { MARK_SVG } from '../lib/mark'
import { cmsText, wordmarkOf } from './content'
import SectionLink from './SectionLink'

export default function PageHeader() {
  const site = useSite(), hero = useHero(), about = useAbout()
  const role = cmsText(about.heading).split(/[,.]/)[0] || 'Full-stack developer'
  const location = cmsText(hero.location) || 'Venice'
  const nav = site.nav.length ? site.nav : [{ label: 'Work', href: '/#work' }, { label: 'Contact', href: '/#contact' }]

  return (
    <header className="page-header">
      <Link to="/" className="ph-brand" aria-label="Daniel Busetto, home">
        <b className="ph-full">{wordmarkOf(hero.name)}.</b><b className="ph-logo" aria-hidden="true" dangerouslySetInnerHTML={{ __html: MARK_SVG }} /><span>{role}, {location}</span>
      </Link>
      <nav className="ph-nav" aria-label="Main">
        {nav.map((n, i) => {
          const cls = 'ph-link' + (i === nav.length - 1 ? ' ph-pill' : '')
          const id = n.href.match(/^\/?#(.+)$/)?.[1]
          return id
            ? <SectionLink key={n.href} to={id} className={cls}>{n.label}</SectionLink>
            : <a key={n.href} href={n.href} className={cls}>{n.label}</a>
        })}
      </nav>
    </header>
  )
}
