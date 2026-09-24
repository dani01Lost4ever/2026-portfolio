/**
 * Pointer input for the field: hover position (repulsion + swirl), drag-to-rotate with inertia on
 * empty space, and click/tap shockwaves. Listeners live on window; nothing here touches three.js.
 */
import { FIELD_NO_DRAG } from '../contract'
import { clamp } from './math'

/** With a mouse, text-ish inline elements also keep their native behaviour (selection). */
const MOUSE_NO_DRAG = `${FIELD_NO_DRAG}, span, svg, img, video`

export interface PointerState {
  /** Pointer in NDC (-1..1), y up. */
  x: number
  y: number
  /** Smoothed NDC for camera parallax. */
  sx: number
  sy: number
  active: boolean
  type: string
  drag: boolean
}

export interface RotState {
  x: number
  y: number
  vx: number
  vy: number
}

export interface PointerInputOptions {
  /** Called on a click/tap that did not move, with client coordinates. */
  onShock(clientX: number, clientY: number): void
}

function closest(target: EventTarget | null, sel: string): Element | null {
  return target instanceof Element ? target.closest(sel) : null
}

export class PointerInput {
  readonly ptr: PointerState = { x: 0, y: 0, sx: 0, sy: 0, active: false, type: 'mouse', drag: false }
  readonly rot: RotState = { x: 0, y: 0, vx: 0, vy: 0 }

  private down = false
  private id = -1
  private x0 = 0
  private y0 = 0
  private lx = 0
  private ly = 0
  private t0 = 0
  private moved = false
  private canDrag = false
  private readonly opts: PointerInputOptions
  private readonly root = document.documentElement

  constructor(opts: PointerInputOptions) {
    this.opts = opts
    window.addEventListener('pointerdown', this.onDown)
    window.addEventListener('pointermove', this.onMove, { passive: true })
    window.addEventListener('pointerup', this.onUp)
    window.addEventListener('pointercancel', this.onCancel)
    window.addEventListener('blur', this.onBlur)
    this.root.addEventListener('mouseleave', this.onBlur)
  }

  dispose(): void {
    window.removeEventListener('pointerdown', this.onDown)
    window.removeEventListener('pointermove', this.onMove)
    window.removeEventListener('pointerup', this.onUp)
    window.removeEventListener('pointercancel', this.onCancel)
    window.removeEventListener('blur', this.onBlur)
    this.root.removeEventListener('mouseleave', this.onBlur)
    this.root.classList.remove('dragging')
  }

  /** Advance drag inertia by one frame (frame-rate coupled, as in the design). */
  step(): void {
    const rot = this.rot
    if (!this.ptr.drag) {
      rot.x += rot.vx
      rot.y = clamp(rot.y + rot.vy, -0.7, 0.7)
      rot.vx *= 0.93
      rot.vy *= 0.93
      if (Math.abs(rot.vx) + Math.abs(rot.vy) < 4e-3) {
        rot.x *= 0.96
        rot.y *= 0.96
      }
    } else {
      rot.vx *= 0.7
      rot.vy *= 0.7
    }
  }

  private ndc(e: PointerEvent): void {
    this.ptr.x = (e.clientX / innerWidth) * 2 - 1
    this.ptr.y = -(e.clientY / innerHeight) * 2 + 1
  }

  private onDown = (e: PointerEvent): void => {
    if (e.button !== 0) return
    this.ndc(e)
    this.ptr.active = true
    this.ptr.type = e.pointerType
    this.down = true
    this.id = e.pointerId
    this.x0 = this.lx = e.clientX
    this.y0 = this.ly = e.clientY
    this.t0 = performance.now()
    this.moved = false
    this.ptr.drag = false
    this.canDrag = !closest(e.target, e.pointerType === 'mouse' ? MOUSE_NO_DRAG : FIELD_NO_DRAG)
    if (e.pointerType === 'mouse' && this.canDrag) e.preventDefault()
  }

  private onMove = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse' || (this.down && e.pointerId === this.id)) {
      this.ndc(e)
      this.ptr.active = true
      this.ptr.type = e.pointerType
    }
    if (!this.down || e.pointerId !== this.id) return
    const dx = e.clientX - this.lx
    const dy = e.clientY - this.ly
    const tx = e.clientX - this.x0
    const ty = e.clientY - this.y0
    this.lx = e.clientX
    this.ly = e.clientY
    if (!this.moved && Math.hypot(tx, ty) > 6) {
      this.moved = true
      // touch: only horizontal-ish drags rotate, vertical ones stay native page scroll
      if (this.canDrag && (this.ptr.type === 'mouse' || Math.abs(tx) > Math.abs(ty) * 1.3)) {
        this.ptr.drag = true
        this.root.classList.add('dragging')
      }
    }
    if (this.ptr.drag) {
      const rot = this.rot
      rot.vx = dx * 0.006
      rot.vy = dy * 0.004
      rot.x += rot.vx
      rot.y = clamp(rot.y + rot.vy, -0.7, 0.7)
    }
  }

  private end(e: PointerEvent, cancelled: boolean): void {
    if (!this.down || e.pointerId !== this.id) return
    if (!cancelled && !this.moved && this.canDrag && performance.now() - this.t0 < 500) this.opts.onShock(e.clientX, e.clientY)
    this.down = false
    this.ptr.drag = false
    this.root.classList.remove('dragging')
    if (this.ptr.type !== 'mouse') this.ptr.active = false
  }

  private onUp = (e: PointerEvent): void => this.end(e, false)
  private onCancel = (e: PointerEvent): void => this.end(e, true)
  private onBlur = (): void => {
    this.ptr.active = false
  }
}
