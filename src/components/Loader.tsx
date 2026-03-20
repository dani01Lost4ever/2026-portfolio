import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

export default function Loader({ onComplete }: { onComplete: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const overlay = overlayRef.current!
    const svg = svgRef.current!

    const constructions = svg.querySelectorAll<SVGGeometryElement>('.c-line')
    const strokes = svg.querySelectorAll<SVGGeometryElement>('.l-stroke')

    constructions.forEach(el => {
      const len = el.getTotalLength()
      gsap.set(el, { strokeDasharray: len, strokeDashoffset: len })
    })
    strokes.forEach(el => {
      const len = el.getTotalLength()
      gsap.set(el, { strokeDasharray: len, strokeDashoffset: len })
    })

    const tl = gsap.timeline()

    // 1. Construction grid draws in
    tl.to([...constructions], {
      strokeDashoffset: 0,
      duration: 0.9,
      stagger: 0.06,
      ease: 'power2.inOut',
    })
    // 2. Letter strokes draw in with stagger
    .to([...strokes], {
      strokeDashoffset: 0,
      duration: 0.75,
      stagger: 0.1,
      ease: 'power2.out',
    }, '-=0.2')
    // 3. Hold
    .to({}, { duration: 0.8 })
    // 4. Slide overlay up
    .to(overlay, {
      yPercent: -100,
      duration: 1.1,
      ease: 'power3.inOut',
      onComplete,
    })

    return () => { tl.kill() }
  }, [onComplete])

  return (
    <div ref={overlayRef} className="loader-overlay">
      {/*
        ViewBox: 0 0 400 80
        Letters: D(0) A(72) N(148) I(228) E(276) L(348)
        Each letter ~56px wide with 16px gaps, stroke-width 14, linecap round
      */}
      <svg
        ref={svgRef}
        viewBox="0 0 400 80"
        className="loader-svg"
        fill="none"
        aria-hidden="true"
      >
        {/* ── Construction grid ── */}
        {/* Horizontal guides */}
        <line className="c-line" x1="-10" y1="4"  x2="410" y2="4"  stroke="rgba(255,255,255,0.13)" strokeWidth="1" />
        <line className="c-line" x1="-10" y1="44" x2="410" y2="44" stroke="rgba(255,255,255,0.13)" strokeWidth="1" />
        <line className="c-line" x1="-10" y1="76" x2="410" y2="76" stroke="rgba(255,255,255,0.13)" strokeWidth="1" />
        {/* Vertical guides at letter boundaries */}
        <line className="c-line" x1="0"   y1="-4" x2="0"   y2="84" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <line className="c-line" x1="72"  y1="-4" x2="72"  y2="84" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <line className="c-line" x1="148" y1="-4" x2="148" y2="84" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <line className="c-line" x1="228" y1="-4" x2="228" y2="84" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <line className="c-line" x1="276" y1="-4" x2="276" y2="84" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <line className="c-line" x1="348" y1="-4" x2="348" y2="84" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        {/* Arc construction circles */}
        <circle className="c-line" cx="8"   cy="40" r="36" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

        {/* ── D  (x: 0–56) ── #5465ff */}
        <line  className="l-stroke" x1="8" y1="4" x2="8" y2="76"       stroke="#5465ff" strokeWidth="14" strokeLinecap="round" />
        <path  className="l-stroke" d="M8,4 A36,36 0 0,1 8,76"          stroke="#5465ff" strokeWidth="14" strokeLinecap="round" />

        {/* ── A  (x: 72–128) ── #e040fb */}
        <line  className="l-stroke" x1="76"  y1="76" x2="100" y2="4"   stroke="#e040fb" strokeWidth="14" strokeLinecap="round" />
        <line  className="l-stroke" x1="100" y1="4"  x2="124" y2="76"  stroke="#e040fb" strokeWidth="14" strokeLinecap="round" />
        <line  className="l-stroke" x1="85"  y1="50" x2="115" y2="50"  stroke="#e040fb" strokeWidth="14" strokeLinecap="round" />

        {/* ── N  (x: 148–208) ── #ff4757 */}
        <line  className="l-stroke" x1="156" y1="4"  x2="156" y2="76"  stroke="#ff4757" strokeWidth="14" strokeLinecap="round" />
        <line  className="l-stroke" x1="156" y1="4"  x2="200" y2="76"  stroke="#ff4757" strokeWidth="14" strokeLinecap="round" />
        <line  className="l-stroke" x1="200" y1="4"  x2="200" y2="76"  stroke="#ff4757" strokeWidth="14" strokeLinecap="round" />

        {/* ── I  (x: 228–256) ── #ffd32a */}
        <line  className="l-stroke" x1="242" y1="4" x2="242" y2="76"   stroke="#ffd32a" strokeWidth="14" strokeLinecap="round" />

        {/* ── E  (x: 276–332) ── #2ed573 */}
        <line  className="l-stroke" x1="284" y1="4"  x2="284" y2="76"  stroke="#2ed573" strokeWidth="14" strokeLinecap="round" />
        <line  className="l-stroke" x1="284" y1="4"  x2="322" y2="4"   stroke="#2ed573" strokeWidth="14" strokeLinecap="round" />
        <line  className="l-stroke" x1="284" y1="40" x2="310" y2="40"  stroke="#2ed573" strokeWidth="14" strokeLinecap="round" />
        <line  className="l-stroke" x1="284" y1="76" x2="322" y2="76"  stroke="#2ed573" strokeWidth="14" strokeLinecap="round" />

        {/* ── L  (x: 348–400) ── #00b0ff */}
        <line  className="l-stroke" x1="356" y1="4"  x2="356" y2="76"  stroke="#00b0ff" strokeWidth="14" strokeLinecap="round" />
        <line  className="l-stroke" x1="356" y1="76" x2="394" y2="76"  stroke="#00b0ff" strokeWidth="14" strokeLinecap="round" />
      </svg>
    </div>
  )
}
