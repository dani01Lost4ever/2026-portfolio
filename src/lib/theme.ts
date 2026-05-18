/**
 * Theme provider — warm-dark default + paper light variant.
 *
 * Persists per-visitor in localStorage. First visit respects
 * prefers-color-scheme: the warm-dark editorial mode is the
 * default identity, so if the visitor has no preference set
 * we ship dark. We only flip to light when the OS explicitly
 * asks for it (and no prior choice exists).
 */

import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'portfolio.theme'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    /* localStorage may be blocked */
  }
  if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light'
  return 'dark'
}

/**
 * Apply the theme to <html data-theme="..."> *before* React mounts,
 * to avoid a flash of the wrong palette on first paint. Call once
 * from main.tsx (before ReactDOM.render).
 */
export function applyInitialTheme() {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', getInitialTheme())
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof document !== 'undefined') {
      const attr = document.documentElement.getAttribute('data-theme')
      if (attr === 'light' || attr === 'dark') return attr
    }
    return getInitialTheme()
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* localStorage may be blocked */
    }
  }, [theme])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])
  const toggle = useCallback(
    () => setThemeState(prev => (prev === 'dark' ? 'light' : 'dark')),
    [],
  )

  return { theme, setTheme, toggle }
}
