/**
 * Lenis smooth scrolling synced with GSAP ScrollTrigger, plus global handling of in-page anchor
 * clicks (href="#id", and "/#id" while on "/"): eased scroll with the fixed-nav offset, then focus
 * moves to the target and the hash is updated. Without smoothing (reduced motion / static
 * fallback) every scroll is an instant jump.
 */
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { easeInOutCubic } from './engine/math'

export const DEFAULT_NAV_SELECTOR = '[data-field-nav], .nav, body > nav, header nav'

export interface SmoothScrollToOptions {
  /** Pixels to leave above the target. Default: the fixed nav's height. */
  offset?: number
  /** Seconds. Default 1.4; 0 jumps. */
  duration?: number
  immediate?: boolean
  onComplete?: () => void
}

export interface SmoothScroll {
  readonly lenis: Lenis | null
  /** Target: an element, "#id" / "id", or a scroll position in px. */
  scrollTo(target: string | HTMLElement | number, opts?: SmoothScrollToOptions): void
  destroy(): void
}

export interface SmoothScrollOptions {
  /** Enable Lenis. False under reduced motion or the static fallback. */
  smooth: boolean
  navSelector?: string
}

function isFixed(el: HTMLElement): boolean {
  const pos = getComputedStyle(el).position
  return pos === 'fixed' || pos === 'sticky'
}

export function createSmoothScroll(o: SmoothScrollOptions): SmoothScroll {
  let lenis: Lenis | null = null
  let tickerFn: ((time: number) => void) | null = null
  let offScroll: (() => void) | null = null
  if (o.smooth) {
    try {
      gsap.registerPlugin(ScrollTrigger)
      // smooth wheel scrolling; touch keeps native scrolling (no syncTouch)
      const l = new Lenis({ duration: 1.15, smoothWheel: true, syncTouch: false })
      offScroll = l.on('scroll', () => ScrollTrigger.update())
      tickerFn = (time: number) => l.raf(time * 1000)
      gsap.ticker.add(tickerFn)
      gsap.ticker.lagSmoothing(0)
      lenis = l
    } catch {
      lenis = null
    }
  }

  const navOffset = (): number => {
    const nav = document.querySelector<HTMLElement>(o.navSelector ?? DEFAULT_NAV_SELECTOR)
    return nav && isFixed(nav) ? nav.offsetHeight : 0
  }

  const resolve = (target: string | HTMLElement | number, offset?: number): number | null => {
    if (typeof target === 'number') return Math.max(0, target)
    let el: HTMLElement | null
    let id = ''
    if (typeof target === 'string') {
      id = decodeURIComponent(target.replace(/^\/?#/, ''))
      el = id ? document.getElementById(id) : null
      if (!el) return id === 'top' || id === '' ? 0 : null
    } else {
      el = target
      id = el.id
    }
    if (id === 'top') return 0
    return Math.max(0, el.getBoundingClientRect().top + window.scrollY - (offset ?? navOffset()))
  }

  const scrollTo = (target: string | HTMLElement | number, opts: SmoothScrollToOptions = {}): void => {
    const y = resolve(target, opts.offset)
    if (y === null) return
    const instant = opts.immediate || opts.duration === 0 || !lenis
    if (lenis && !instant) {
      lenis.scrollTo(y, { duration: opts.duration ?? 1.4, easing: easeInOutCubic, force: true, onComplete: () => opts.onComplete?.() })
      return
    }
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true })
    else window.scrollTo({ top: y, behavior: 'auto' })
    opts.onComplete?.()
  }

  // capture phase, so router <Link to="/#id"> clicks are handled here before the router sees them
  const onClick = (e: MouseEvent): void => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const a = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>('a[href]') : null
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return
    const href = a.getAttribute('href') ?? ''
    let hash: string
    if (href.startsWith('#')) hash = href.slice(1)
    else if (href.startsWith('/#') && window.location.pathname === '/') hash = href.slice(2)
    else return
    let id: string
    try {
      id = decodeURIComponent(hash)
    } catch {
      return
    }
    const t = id ? document.getElementById(id) : null
    if (!t) return
    e.preventDefault()
    scrollTo(t, {
      onComplete: () => {
        if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1')
        try {
          t.focus({ preventScroll: true })
        } catch {
          t.focus()
        }
        try {
          window.history.replaceState(window.history.state, '', '#' + id)
        } catch {
          /* ignore */
        }
      },
    })
  }
  document.addEventListener('click', onClick, true)

  return {
    get lenis() {
      return lenis
    },
    scrollTo,
    destroy() {
      document.removeEventListener('click', onClick, true)
      if (tickerFn) {
        gsap.ticker.remove(tickerFn)
        gsap.ticker.lagSmoothing(500, 33)
      }
      offScroll?.()
      lenis?.destroy()
      lenis = null
      tickerFn = null
    },
  }
}
