import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useField } from '../field/useField'
import { ArrowRight } from '../components/Icons'
import { STOP_BG, stopAttrs } from '../components/fieldStops'

export default function NotFound() {
  const field = useField()

  useEffect(() => {
    field?.refresh()
  }, [field])

  return (
    <>
      <Helmet>
        <title>Page not found, Daniel Busetto</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <main id="main" tabIndex={-1}>
        <section
          className="hero nf"
          id="top"
          aria-labelledby="nf-title"
          {...stopAttrs({ key: 'constellation', shape: 'constellation', side: 'right', bg: STOP_BG.grid })}
        >
          <div className="hero-inner">
            <p className="kicker">Page not found</p>
            <h1 id="nf-title"><span>You've wandered </span><span>off the map.</span></h1>
            <p className="hero-sub">
              The page you're looking for isn't here. It may have moved, or it may never have existed at all.
            </p>
            <div className="cta">
              <Link to="/" className="btn btn-primary">Back to home <ArrowRight /></Link>
              <Link to="/#contact" className="btn btn-ghost">Or write to me</Link>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
