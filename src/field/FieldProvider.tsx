import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { FieldContext, type FieldContextValue } from './FieldContext'
import { FieldController } from './engine/FieldController'

export interface FieldProviderProps {
  children?: ReactNode
  /** Selector for the fixed nav whose height offsets anchor scrolling. Default: '[data-field-nav], .nav, body > nav, header nav'. */
  navSelector?: string
  /** Set false to keep native scrolling (no Lenis). Default true. Read once on mount. */
  smoothScroll?: boolean
}

/**
 * Runs the particle field for the whole app: stop discovery, scroll → progress, page gradient
 * variables, Lenis smooth scroll + anchor links, hover coupling. Render <FieldCanvas/> once inside it.
 */
export function FieldProvider({ children, navSelector, smoothScroll }: FieldProviderProps) {
  const [controller] = useState(() => new FieldController({ navSelector, smoothScroll }))
  useEffect(() => {
    controller.start()
    return () => controller.stop()
  }, [controller])
  const value = useMemo<FieldContextValue>(() => ({ api: controller.api, attachHost: controller.attachHost }), [controller])
  return <FieldContext.Provider value={value}>{children}</FieldContext.Provider>
}
