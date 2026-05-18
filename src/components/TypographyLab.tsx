/**
 * TypographyLab — interactive type specimen.
 *
 * The word "interface." set in massive Boldonse italic, with each
 * letter independently draggable. Releasing snaps the letter back to
 * its anchor with a soft spring overshoot. A "shuffle" interaction
 * gives every letter a brief random kick that resolves back into the
 * word — useful as a "wake up" affordance when the user hasn't
 * touched anything yet.
 *
 * Why this lives in About: it's a play on the hero's tagline
 * ("…to interface, built to scale"). The visitor literally gets to
 * grab the word that defines the practice.
 */

import { useRef, useState, useEffect } from 'react'
import { motion, useAnimation } from 'framer-motion'

const WORD = 'interface'
const PUNCT = '.'

interface LetterProps {
  glyph: string
  index: number
  total: number
  shakeTrigger: number
}

function Letter({ glyph, index, total, shakeTrigger }: LetterProps) {
  const controls = useAnimation()
  // Each letter starts with a tiny resting rotation so the cluster
  // breathes even at rest — but a small enough amount that the word
  // still reads cleanly. Deterministic per-index so it doesn't reshuffle
  // on every render.
  const restRot = ((index * 37) % 11) - 5    // -5..+5deg
  const isLast = index === total - 1

  useEffect(() => {
    if (shakeTrigger === 0) return
    let cancelled = false
    const kickX = (Math.random() * 60 - 30) * (isLast ? 0.4 : 1)
    const kickY = Math.random() * 40 - 20
    const kickRot = (Math.random() * 24 - 12) + restRot
    ;(async () => {
      await controls.start({
        x: kickX,
        y: kickY,
        rotate: kickRot,
        transition: { type: 'spring', stiffness: 180, damping: 12, mass: 0.6 },
      })
      if (cancelled) return
      await controls.start({
        x: 0,
        y: 0,
        rotate: restRot,
        transition: { type: 'spring', stiffness: 260, damping: 18, mass: 0.7 },
      })
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shakeTrigger])

  return (
    <motion.span
      className={`tl-letter${isLast ? ' is-punct' : ''}`}
      drag
      dragMomentum={false}
      dragElastic={1}
      dragTransition={{ bounceStiffness: 240, bounceDamping: 16 }}
      whileHover={{ scale: 1.08, rotate: restRot, transition: { duration: 0.18, ease: [0.23, 1, 0.32, 1] } }}
      whileTap={{ scale: 0.92, cursor: 'grabbing' }}
      animate={controls}
      initial={{ rotate: restRot }}
      onDragEnd={() => {
        controls.start({
          x: 0,
          y: 0,
          rotate: restRot,
          transition: { type: 'spring', stiffness: 260, damping: 18, mass: 0.7 },
        })
      }}
      aria-hidden
    >
      {glyph}
    </motion.span>
  )
}

export default function TypographyLab() {
  const [shakeKey, setShakeKey] = useState(0)
  const idleTimerRef = useRef<number | null>(null)

  // Auto-shake once after the panel mounts so the visitor sees it's
  // alive. After that, it only reacts to deliberate interaction.
  useEffect(() => {
    idleTimerRef.current = window.setTimeout(() => setShakeKey(k => k + 1), 1400)
    return () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current)
    }
  }, [])

  const glyphs = (WORD + PUNCT).split('')

  return (
    <div className="tl-frame" aria-label="Typography lab">
      <div className="tl-stage">
        <div className="tl-word">
          {glyphs.map((g, i) => (
            <Letter
              key={`${g}-${i}`}
              glyph={g}
              index={i}
              total={glyphs.length}
              shakeTrigger={shakeKey}
            />
          ))}
        </div>
      </div>

      <div className="tl-caption">
        <span className="tl-tag">Lab</span>
        <span className="tl-caption-text">
          Drag the letters · the word is set in Boldonse italic
        </span>
        <button
          type="button"
          className="tl-shuffle"
          onClick={() => setShakeKey(k => k + 1)}
          aria-label="Shuffle the letters"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 3v6h-6" />
            <path d="M3 21v-6h6" />
            <path d="M3 9a9 9 0 0 1 15-3.5L21 9" />
            <path d="M21 15a9 9 0 0 1-15 3.5L3 15" />
          </svg>
          Shake
        </button>
      </div>
    </div>
  )
}
