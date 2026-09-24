import { createContext } from 'react'
import type { FieldApi } from './contract'

/** Internal context value: the public API plus the hook FieldCanvas uses to mount the canvas. */
export interface FieldContextValue {
  api: FieldApi
  /** Mount the WebGL canvas inside `host`; returns the detach function. */
  attachHost(host: HTMLElement): () => void
}

export const FieldContext = createContext<FieldContextValue | null>(null)
