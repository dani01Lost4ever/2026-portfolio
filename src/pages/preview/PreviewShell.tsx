import { type ReactNode, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'

interface PreviewShellProps {
  mock: 'a' | 'b' | 'c'
  children: ReactNode
}

const MOCKS: Array<{ key: 'a' | 'b' | 'c'; label: string; path: string }> = [
  { key: 'a', label: 'A', path: '/preview/a' },
  { key: 'b', label: 'B', path: '/preview/b' },
  { key: 'c', label: 'C', path: '/preview/c' },
]

const TITLES: Record<'a' | 'b' | 'c', string> = {
  a: 'Warm-dark · amber',
  b: 'Paper · vermillion',
  c: 'Editorial · dual-mode',
}

export default function PreviewShell({ mock, children }: PreviewShellProps) {
  const location = useLocation()
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const targets = root.querySelectorAll<HTMLElement>('.pv-reveal')

    if (typeof IntersectionObserver === 'undefined') {
      targets.forEach(el => el.classList.add('is-in'))
      return
    }

    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in')
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
    )

    targets.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [location.pathname])

  return (
    <div ref={rootRef} className={`preview preview-${mock}`}>
      {children}

      <nav className="pv-switcher" aria-label="Preview mock switcher">
        <Link to="/" className="pv-switcher-back" title="Back to live site">←</Link>
        <span className="pv-switcher-sep" aria-hidden />
        <span className="pv-switcher-label">Mock</span>
        {MOCKS.map(m => (
          <Link
            key={m.key}
            to={m.path}
            className={`pv-switcher-chip${m.key === mock ? ' is-current' : ''}`}
            title={TITLES[m.key]}
          >
            {m.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
