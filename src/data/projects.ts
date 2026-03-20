import projectsData from './projects.json'

export interface Project {
  id: string
  slug: string
  year: string
  title: string
  subtitle: string
  description: string
  overview: string
  challenge: string
  solution: string
  tags: string[]
  gradient: string
  results: { value: string; label: string }[]
  role: string
  timeline: string
  link?: string
}

export const projects: Project[] = projectsData as Project[]
