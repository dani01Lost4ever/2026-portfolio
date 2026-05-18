/**
 * Hero — editorial composition.
 *
 * Asymmetric two-column: oversized Boldonse display on the left,
 * accent-tinted flow diagram on the right. No stats row (those
 * live in About). No glow blobs. The eyebrow carries the meta;
 * the headline carries the voice; the CTA stays quiet.
 */

import { motion } from 'framer-motion'
import { useHero } from '../context/ContentContext'
import FlowDiagram from './FlowDiagram'

const lineReveal = {
  hidden: { y: '110%', opacity: 0 },
  show: (i: number) => ({
    y: '0%',
    opacity: 1,
    transition: {
      duration: 0.9,
      delay: 0.15 + i * 0.09,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  }),
}

const fadeIn = {
  hidden: { opacity: 0, y: 18 },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] as const },
  }),
}

export default function Hero() {
  const hero = useHero()

  return (
    <section className="hero" id="hero">
      <div className="container hero-inner">
        <div className="hero-grid">
          {/* ── Left: type-led intro ── */}
          <div className="hero-left">
            <motion.div
              className="hero-eyebrow"
              custom={0}
              variants={fadeIn}
              initial="hidden"
              animate="show"
            >
              <span className="hero-eyebrow-text">
                {hero.availableForWork && <span className="hero-eyebrow-dot" aria-hidden />}
                {hero.availableForWork ? 'Available · Venice, IT' : 'Venice, IT'}
              </span>
              <span className="hero-eyebrow-rule" aria-hidden />
            </motion.div>

            <h1 className="hero-display">
              <span className="hero-line-mask">
                <motion.span
                  className="hero-line"
                  custom={0}
                  variants={lineReveal}
                  initial="hidden"
                  animate="show"
                >
                  From database
                </motion.span>
              </span>
              <span className="hero-line-mask hero-line-mask--indent">
                <motion.span
                  className="hero-line"
                  custom={1}
                  variants={lineReveal}
                  initial="hidden"
                  animate="show"
                >
                  to <span className="hero-accent">interface,</span>
                </motion.span>
              </span>
              <span className="hero-line-mask">
                <motion.span
                  className="hero-line"
                  custom={2}
                  variants={lineReveal}
                  initial="hidden"
                  animate="show"
                >
                  built to scale.
                </motion.span>
              </span>
            </h1>

            <motion.p
              className="hero-tagline"
              custom={0.7}
              variants={fadeIn}
              initial="hidden"
              animate="show"
            >
              <strong>{hero.name ? hero.name : 'Daniel'} Busetto</strong>, full-stack developer.{' '}
              Four years in, one obsession: shipping the whole stack and
              making the seam between API and UI disappear.
            </motion.p>

            <motion.div
              className="hero-cta-row"
              custom={0.85}
              variants={fadeIn}
              initial="hidden"
              animate="show"
            >
              <a href="#work" className="hero-cta">
                See the work
                <svg
                  className="hero-cta-arrow"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </a>
              <a href="#contact" className="hero-cta-ghost">
                Or write to me
              </a>
            </motion.div>
          </div>

          {/* ── Right: schematic diagram ── */}
          <motion.div
            className="hero-right"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <FlowDiagram />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
