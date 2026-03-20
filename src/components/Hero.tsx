import { motion } from 'framer-motion'
import heroData from '../data/hero.json'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.13, delayChildren: 0.15 } },
}

const lineReveal = {
  hidden: { y: '110%', opacity: 0 },
  show: {
    y: '0%',
    opacity: 1,
    transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
  },
}

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
}

export default function Hero() {
  return (
    <section className="hero" id="hero">
      <div className="hero-glow" />
      <div className="hero-glow-2" />

      <div className="container hero-inner">
        {heroData.availableForWork && (
          <motion.span
            className="hero-tag"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
          >
            <span className="hero-tag-dot" />
            Available for work
          </motion.span>
        )}

        {/* Line-by-line text reveal */}
        <motion.h1
          className="hero-heading"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {heroData.taglines.map((line, i) => (
            <span key={i} className="line-mask">
              <motion.span
                className={`line-text${i === heroData.taglines.length - 1 ? ' accent' : ''}`}
                variants={lineReveal}
              >
                {line}
              </motion.span>
            </span>
          ))}
        </motion.h1>

        <motion.p
          className="hero-subtitle"
          variants={fadeIn}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.55 }}
        >
          {heroData.subtitle}
        </motion.p>

        <motion.div
          className="hero-actions"
          variants={fadeIn}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.65 }}
        >
          {heroData.cta.map(btn => (
            <a key={btn.label} href={btn.href} className={`btn btn-${btn.variant}`}>
              {btn.label}
            </a>
          ))}
        </motion.div>

        {/* Stats row */}
        <motion.div
          className="hero-stats"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          {heroData.stats.map((s, i) => (
            <div key={s.label} className="hero-stat">
              {i > 0 && <div className="hero-stat-div" />}
              <span className="hero-stat-value">{s.value}</span>
              <span className="hero-stat-label">{s.label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      <motion.div
        className="hero-scroll"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.6 }}
      >
        <span>Scroll</span>
        <div className="hero-scroll-line" />
      </motion.div>
    </section>
  )
}
