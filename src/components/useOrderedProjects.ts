import { useMemo } from 'react'
import { useProjects } from '../context/content-hooks'
import { visualsFor } from '../lib/projectVisuals'

/** All projects in CMS `order`, with their field visuals and the tech cube data in the same order. */
export function useOrderedProjects() {
  const projects = useProjects()
  return useMemo(() => {
    const ordered = [...projects].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    const visuals = ordered.map(visualsFor)
    const cubeProjects = ordered.map((p, i) => ({ name: p.title, layers: visuals[i].layers }))
    return { projects: ordered, visuals, cubeProjects }
  }, [projects])
}
