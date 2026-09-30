/**
 * PageHeader — the sticky header of every page but the film: the brand back
 * to the home page on the left (the CMS logo on narrow screens), the CMS nav
 * on the right, its last item as a pill. A film chapter (`/#work`) is a
 * section link, another page of the site (`/prototypes`) a router link,
 * marked as current on that page (and as part of the path on the pages under it).
 */

import { Link, useLocation } from 'react-router-dom'
import { useSite } from '../context/content-hooks'
import { cmsText } from './content'
import SectionLink from './SectionLink'

/** The path of a link to another page of this app ("/prototypes/" → "/prototypes", "/" → ""), or null for anything else: other sites, files like /cv.pdf. */
function routePath(href: string): string | null {
  const path = href.match(/^(\/(?!\/)[^?#]*)/)?.[1]
  if (path === undefined || /\.[a-z0-9]+$/i.test(path)) return null
  return path.replace(/\/+$/, '')
}

export default function PageHeader() {
  const site = useSite()
  const { pathname } = useLocation()
  const logo = cmsText(site.logo) || 'DB'
  const nav = site.nav.length ? site.nav : [{ label: 'Work', href: '/#work' }, { label: 'Contact', href: '/#contact' }]

  return (
    <header className="page-header">
      <Link to="/" className="ph-brand" aria-label="Daniel Busetto, home">
        <b className="ph-full">Daniel Busetto</b><b className="ph-logo" aria-hidden="true">{logo}</b> <span>· full-stack developer, Venice</span>
      </Link>
      <nav className="ph-nav" aria-label="Main">
        {nav.map((n, i) => {
          const cls = 'ph-link' + (i === nav.length - 1 ? ' ph-pill' : '')
          const id = n.href.match(/^\/?#(.+)$/)?.[1]
          if (id) return <SectionLink key={n.href} to={id} className={cls}>{n.label}</SectionLink>
          const route = routePath(n.href)
          if (route !== null) {
            // "page" on that page itself, "true" on the pages under it (a prototype under /prototypes)
            const current = pathname.replace(/\/+$/, '') === route ? 'page' : route && pathname.startsWith(route + '/') ? 'true' : undefined
            return <Link key={n.href} to={n.href} className={cls} aria-current={current}>{n.label}</Link>
          }
          return <a key={n.href} href={n.href} className={cls}>{n.label}</a>
        })}
      </nav>
    </header>
  )
}
