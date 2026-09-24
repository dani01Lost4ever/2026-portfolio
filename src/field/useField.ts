import { useContext } from 'react'
import type { FieldApi } from './contract'
import { FieldContext } from './FieldContext'

/** The running field's API, or null outside a <FieldProvider>. The object is stable for the provider's lifetime. */
export function useField(): FieldApi | null {
  return useContext(FieldContext)?.api ?? null
}
