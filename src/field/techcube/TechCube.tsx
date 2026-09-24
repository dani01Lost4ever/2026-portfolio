import { useEffect, useRef } from 'react'
import type { CubeLayer } from '../contract'
import { createTechCube, type TechCubeInstance, type TechCubeProject } from './techcube'
import { useField } from './fieldBridge'
import './techcube.css'

export interface TechCubeProps {
  /** All projects, in page order — the cube needs neighbours to turn through as it enters/leaves. */
  projects: { name: string; layers: CubeLayer[] }[]
  /** This cube's own project index into `projects`. */
  index: number
  /** Unique field-stop key, e.g. "project:bugpilot"; used for field.pulse(). */
  stopKey: string
  /** This project's top/bottom tint, blended into the cube's glow. */
  tint?: [string, string]
  className?: string
}

/** Aqua point colour the field paints stops with — the neutral base the tint blends toward. */
const FIELD_AQUA: [number, number, number] = [94, 216, 203]

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Same blend the field uses for its own per-project tint: gradient average, 62%, softened toward its aqua. */
function tintToRgbString(tint: [string, string] | undefined): string | null {
  if (!tint) return null
  const a = hexToRgb(tint[0])
  const b = hexToRgb(tint[1])
  if (!a || !b) return null
  const rgb = [0, 1, 2].map((i) => Math.round(((a[i] + b[i]) / 2) * 0.62 + FIELD_AQUA[i] * 0.38))
  return rgb.join(',')
}

function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v
}

/**
 * Local progress for this one cube: it turns from index-1 to index while its
 * slot travels from ~92% to ~50% of the viewport height, rests there while
 * the project is read, then turns on toward index+1 as it keeps leaving
 * (the mirrored 50%→8% band). Mirrors the whole-page formula in
 * designs/field.html, applied to a single slot instead of summed over all of them.
 */
function localProgress(rect: DOMRect, viewportH: number, index: number, maxIndex: number): number {
  const centerRel = rect.top + rect.height / 2
  const enter = clamp((0.92 * viewportH - centerRel) / (0.42 * viewportH), 0, 1)
  const leave = clamp((0.5 * viewportH - centerRel) / (0.42 * viewportH), 0, 1)
  return clamp(index - 1 + enter + leave, 0, maxIndex)
}

export function TechCube({ projects, index, stopKey, tint, className }: TechCubeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const instanceRef = useRef<TechCubeInstance | null>(null)
  const visibleRef = useRef(true)
  const field = useField()

  // Keep the latest field/stopKey/projects/index in refs so the mount effect
  // (which must only run once per DOM node) always calls out to current values.
  const liveRef = useRef({ field, stopKey, projects, index })
  liveRef.current = { field, stopKey, projects, index }

  useEffect(() => {
    const container = rootRef.current
    if (!container) return

    const engineProjects: TechCubeProject[] = liveRef.current.projects.map((p) => ({
      name: p.name,
      layers: p.layers,
    }))

    const instance = createTechCube(container, {
      projects: engineProjects,
      fit: true,
      smoothing: 0.09,
      reducedMotion: liveRef.current.field?.isStatic ? true : undefined,
      onPulse: () => {
        liveRef.current.field?.pulse(liveRef.current.stopKey)
      },
    })
    instanceRef.current = instance
    const tintRgb = tintToRgbString(tint)
    if (tintRgb) instance.setTint(tintRgb)

    // Pause all per-frame work while off screen (on top of the engine's own
    // internal pause, which only covers its idle sway/spring loop).
    const io = new IntersectionObserver(
      (entries) => {
        visibleRef.current = entries[entries.length - 1]?.isIntersecting ?? true
      },
      { rootMargin: '120px' },
    )
    io.observe(container)

    let raf = 0
    let lastRestFired: number | null = null
    let unsubscribeField: (() => void) | undefined

    function tick() {
      if (!visibleRef.current || !container) return
      const { field: liveField, index: liveIndex, projects: liveProjects } = liveRef.current
      const rect = container.getBoundingClientRect()
      const maxIndex = Math.max(0, liveProjects.length - 1)
      const p = localProgress(rect, window.innerHeight, liveIndex, maxIndex)
      instance.setProgress(p)
      if (Math.abs(p - liveIndex) < 1e-3) {
        if (lastRestFired !== liveIndex) {
          lastRestFired = liveIndex
          liveField?.pulse(liveRef.current.stopKey)
        }
      } else {
        lastRestFired = null
      }
    }

    const currentField = liveRef.current.field
    if (currentField) {
      unsubscribeField = currentField.onProgress(() => tick())
      tick()
    } else {
      const onScroll = () => {
        if (!raf) raf = requestAnimationFrame(() => { raf = 0; tick() })
      }
      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', onScroll)
      tick()
      unsubscribeField = () => {
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', onScroll)
      }
    }

    return () => {
      unsubscribeField?.()
      if (raf) cancelAnimationFrame(raf)
      io.disconnect()
      instance.destroy()
      instanceRef.current = null
    }
    // Mount once per DOM node; live values are read through liveRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Tint can change (e.g. content edits) without remounting the whole cube.
  useEffect(() => {
    instanceRef.current?.setTint(tintToRgbString(tint))
  }, [tint])

  // If the field switches into its static fallback (WebGL unavailable / reduced
  // motion) after mount, snap the cube's own motion to match.
  useEffect(() => {
    if (field?.isStatic) instanceRef.current?.setReducedMotion(true)
  }, [field?.isStatic])

  return <div ref={rootRef} className={className} data-field-key={stopKey} />
}

export default TechCube
