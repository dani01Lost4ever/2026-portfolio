import { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { useContent } from '../context/content-hooks'
import { useField } from '../field/useField'
import Hero from '../components/Hero'
import Work from '../components/Work'
import About from '../components/About'
import Experience from '../components/Experience'
import Contact from '../components/Contact'
import SiteFooter from '../components/SiteFooter'

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
  const field = useField()
  const content = useContent()

  // Stops change when CMS content swaps in (project count, skill groups, roles).
  useEffect(() => {
    field?.refresh()
  }, [field, content])

  return (
    <>
      <HomeSeo />
      <main id="main" tabIndex={-1}>
        <Hero />
        <Work />
        <About />
        <Experience />
        <Contact />
      </main>
      <SiteFooter />
    </>
  )
}
