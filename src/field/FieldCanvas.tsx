import { useContext, useEffect, useRef, type CSSProperties } from 'react'
import { FieldContext } from './FieldContext'

const HOST_STYLE: CSSProperties = { position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }

export interface FieldCanvasProps {
  className?: string
}

/**
 * The fixed full-screen WebGL layer. Mount it once, inside <FieldProvider>, before the page
 * content (which should sit above it: position relative, z-index >= 1). The <canvas> itself is
 * created and destroyed by the engine, so remounts always get a fresh WebGL context. Renders an
 * empty (hidden) host in the static fallback.
 */
export function FieldCanvas({ className }: FieldCanvasProps) {
  const ctx = useContext(FieldContext)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!ctx || !el) return
    return ctx.attachHost(el)
  }, [ctx])
  return <div ref={ref} className={className ? `field-canvas ${className}` : 'field-canvas'} aria-hidden="true" style={HOST_STYLE} />
}
