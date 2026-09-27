/**
 * Home — the One Take film. With reduced motion the same content is a plain reading page
 * (TakeDocument with links), under the regular page header and footer.
 */

import { useMemo } from 'react'
import { Helmet } from 'react-helmet-async'
import { useContent } from '../context/content-hooks'
import PageHeader from '../components/PageHeader'
import SiteFooter from '../components/SiteFooter'
import TakeFilm from '../take/TakeFilm'
import TakeDocument from '../take/TakeDocument'
import { takeContent } from '../take/engine/content'
import { useReducedMotion } from '../take/useReducedMotion'

function HomeSeo() {
  const { hero } = useContent()
  const title = 'Daniel Busetto, full-stack developer'
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={hero.subtitle} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={hero.subtitle} />
      <meta name="twitter:card" content="summary_large_image" />
    </Helmet>
  )
}

export default function Home() {
  const reduced = useReducedMotion()
  const bundle = useContent()
  const content = useMemo(() => takeContent(bundle), [bundle])

  if (reduced) {
    return (
      <>
        <HomeSeo />
        <PageHeader />
        <main id="main" tabIndex={-1}>
          <TakeDocument c={content} interactive />
        </main>
        <SiteFooter />
      </>
    )
  }
  return (
    <>
      <HomeSeo />
      <main id="main" tabIndex={-1}>
        <TakeFilm />
      </main>
    </>
  )
}
