/**
 * NotFound — editorial 404.
 *
 * Asymmetric typographic moment instead of the giant background "404".
 * Mono eyebrow with the error code, Boldonse headline with an italic
 * amber accent on the punchline, mono sub, primary CTA back home.
 */

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'

export default function NotFound() {
  return (
    <motion.div
      className="not-found"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Helmet>
        <title>404 — Page not found</title>
      </Helmet>

      <div className="container not-found-inner">
        <motion.div
          className="not-found-eyebrow"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="not-found-eyebrow-num">404</span>
          <span className="not-found-eyebrow-rule" aria-hidden />
          <span>Error · resource missing</span>
        </motion.div>

        <motion.h1
          className="not-found-heading"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          You've wandered<br />
          <span className="not-found-accent">off the map.</span>
        </motion.h1>

        <motion.p
          className="not-found-sub"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.30, ease: [0.16, 1, 0.3, 1] }}
        >
          The page you're looking for isn't here. It may have moved, or it
          may never have existed at all.
        </motion.p>

        <motion.div
          className="not-found-cta-row"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.42, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link to="/" className="hero-cta">
            Back to home
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
          <Link to="/#contact" className="hero-cta-ghost">
            Or write to me
          </Link>
        </motion.div>
      </div>
    </motion.div>
  )
}
