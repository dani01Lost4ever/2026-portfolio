import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

export default function Cursor() {
  const [visible, setVisible] = useState(false)
  const [state, setState] = useState<'default' | 'hover' | 'card'>('default')

  const mouseX = useMotionValue(-100)
  const mouseY = useMotionValue(-100)

  const springX = useSpring(mouseX, { stiffness: 520, damping: 48, mass: 0.5 })
  const springY = useSpring(mouseY, { stiffness: 520, damping: 48, mass: 0.5 })

  useEffect(() => {
    // Only activate on pointer devices
    if (!window.matchMedia('(hover: hover)').matches) return

    const onMove = (e: MouseEvent) => {
      if (!visible) setVisible(true)
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)

      const target = e.target as Element
      if (target.closest('.project-card')) {
        setState('card')
      } else if (target.closest('a, button')) {
        setState('hover')
      } else {
        setState('default')
      }
    }

    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [visible, mouseX, mouseY])

  if (!visible) return null

  const ringSize = state === 'card' ? 76 : state === 'hover' ? 54 : 38

  return (
    <>
      {/* Dot — exact position */}
      <motion.div
        className="cursor-dot"
        style={{ x: mouseX, y: mouseY }}
      />

      {/* Ring — spring lag */}
      <motion.div
        className={`cursor-ring cursor-ring--${state}`}
        style={{ x: springX, y: springY }}
        animate={{ width: ringSize, height: ringSize }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        {state === 'card' && <span className="cursor-label">View</span>}
      </motion.div>
    </>
  )
}
