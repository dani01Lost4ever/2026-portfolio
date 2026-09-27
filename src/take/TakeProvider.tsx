import { useState, type ReactNode } from 'react'
import { TakeContext, TakeRegistry, type TakeApi } from './TakeContext'

/** Makes the film's API reachable from outside the home page's tree (the command palette, section links). */
export function TakeProvider({ children }: { children: ReactNode }) {
  const [api, setApi] = useState<TakeApi | null>(null)
  return (
    <TakeRegistry.Provider value={setApi}>
      <TakeContext.Provider value={api}>{children}</TakeContext.Provider>
    </TakeRegistry.Provider>
  )
}
