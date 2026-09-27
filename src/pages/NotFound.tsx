/**
 * NotFound — the 404 page: a huge "lost." wordmark, one line of text and the
 * ways back. Kept out of search results.
 */

import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowRight } from '../components/Icons'
import PageHeader from '../components/PageHeader'

export default function NotFound() {
  return (
    <>
      <Helmet>
        <title>Page not found, Daniel Busetto</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <PageHeader />
      <main id="main" tabIndex={-1} className="nf">
        <section className="nf-inner" id="top" aria-labelledby="nf-title">
          <p className="nf-kicker">Error 404 · page not found</p>
          <h1 id="nf-title" className="nf-word">lost<span className="nf-dot" aria-hidden="true" /></h1>
          <p className="nf-text">
            The page you're looking for isn't here. It may have moved, or it may never have existed at all.
          </p>
          <div className="nf-actions">
            <Link to="/" className="btn btn-primary">Back to the film <ArrowRight /></Link>
            <Link to="/#contact" className="btn btn-ghost">Write to me</Link>
          </div>
        </section>
      </main>
    </>
  )
}
