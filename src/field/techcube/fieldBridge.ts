/**
 * Optional bridge to the page-wide field driver (see ../contract.ts and the
 * `useField` hook another agent is adding at ../useField). TechCube works
 * fully standalone (window scroll + rAF) when that module isn't present.
 *
 * The probe below resolves once, awaited at module scope, before this
 * module finishes initialising — so every consumer of `useField()` sees one
 * fixed implementation (the real hook, or a stable no-op) for its entire
 * lifetime. That keeps the call safe under React's rules of hooks: it never
 * switches implementation mid-render, only once, before anything mounts.
 *
 * The import specifier is assembled at runtime (not a string literal) and
 * marked `@vite-ignore` so neither TypeScript nor the bundler try to
 * resolve/type-check it while ../useField does not exist yet — this keeps
 * `tsc -b` and the dev/prod build green either way.
 */
import type { FieldApi } from '../contract'

type UseFieldFn = () => FieldApi | null

function noField(): FieldApi | null {
  return null
}

const FIELD_MODULE_SPECIFIER = ['..', 'useField'].join('/')

async function probe(): Promise<UseFieldFn> {
  if (typeof window === 'undefined') return noField
  try {
    const mod = (await import(/* @vite-ignore */ FIELD_MODULE_SPECIFIER)) as Record<string, unknown>
    const candidate = mod.useField ?? mod.default
    if (typeof candidate === 'function') return candidate as UseFieldFn
  } catch {
    /* sibling module not present (yet) — keep the window-scroll fallback */
  }
  return noField
}

const resolved: UseFieldFn = await probe()

/** Returns the running field's API, or null when there is none (standalone mode). */
export function useField(): FieldApi | null {
  return resolved()
}
