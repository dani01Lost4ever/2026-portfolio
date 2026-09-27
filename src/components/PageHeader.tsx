/**
 * PageHeader — the sticky header of every page but the film: the brand back
 * to the home page on the left (the CMS logo on narrow screens, with the
 * availability chip when the CMS says so), the CMS nav on the right, its last
 * item as a pill.
 */

import { Link } from 'react-router-dom'
import { useHero, useSite } from '../context/content-hooks'
import { cmsText } from './content'
import SectionLink from './SectionLink'

export default function PageHeader() {
  const site = useSite()
  const hero = useHero()
  const logo = cmsText(site.logo) || 'DB'
  const nav = site.nav.length ? site.nav : [{ label: 'Work', href: '/#work' }, { label: 'Contact', href: '/#contact' }]

  return (
    <header className="page-header">
      <Link to="/" className="ph-brand" aria-label="Daniel Busetto, home">
        <b className="ph-full">Daniel Busetto</b><b className="ph-logo" aria-hidden="true">{logo}</b> <span>· full-stack developer, Venice</span>
        {hero.availableForWork !== false && <i className="ph-avail">Available for work</i>}
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
