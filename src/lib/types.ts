// ─── Project visuals ──────────────────────────────────────────────────────────

/** Which poster a project gets in the film and on its page (see take/posters.ts). */
export type ShapeId =
  | 'bug' | 'loop' | 'orbit' | 'candles' | 'globe' | 'clocks' | 'coins'
  | 'browser' | 'tictactoe' | 'battleship' | 'generic'

/** One layer of a project's architecture, top to bottom. */
export interface CubeLayer {
  label: string
  tech: string
}

// ─── Shared ──────────────────────────────────────────────────────────────────

export interface NavItem {
  label: string
  href: string
}

export interface SiteData {
  logo: string
  nav: NavItem[]
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

export interface Cta {
  label: string
  href: string
  variant: string
}

export interface Stat {
  value: string
  label: string
}

export interface HeroData {
  availableForWork: boolean
  name: string
  location: string
  taglines: string[]
  subtitle: string
  cta: Cta[]
  stats: Stat[]
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export interface Result {
  value: string
  label: string
}

export interface Project {
  id: string        // display id e.g. "01"
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
  results: Result[]
  role: string
  timeline: string
  link?: string
  order: number
  views?: number
  /** Poster shape. Falls back to the registry/heuristics in lib/projectVisuals.ts. */
  shape?: ShapeId
  /** Architecture layers, top to bottom (4 entries). Falls back to tag-derived layers when absent. */
  layers?: CubeLayer[]
  /** One-line summary used as the project's headline in the film. Falls back to `subtitle`. */
  caption?: string
}

// ─── About ────────────────────────────────────────────────────────────────────

export interface SkillGroup {
  category: string
  items: string[]
}

export interface AboutData {
  label: string
  heading: string
  bio: string[]
  skills: SkillGroup[]
}

// ─── Contact ──────────────────────────────────────────────────────────────────

export interface Social {
  label: string
  href: string
}

export interface ContactData {
  label: string
  heading: string
  headingAccent: string
  availability: string
  email: string
  socials: Social[]
  copyright: string
}

// ─── Experience ───────────────────────────────────────────────────────────────

export interface WorkRole {
  role: string
  type: string
  period: string
  location?: string
  tags: string[]
}

export interface WorkEntry {
  company: string
  companyDuration: string
  roles: WorkRole[]
}

export interface EducationEntry {
  school: string
  degree: string
  field: string
  period: string
  grade?: string
  tags: string[]
}

export interface ExperienceData {
  work: WorkEntry[]
  education: EducationEntry[]
}

// ─── Now ──────────────────────────────────────────────────────────────────────

export interface NowItem {
  label: string   // "Now building"
  value: string
}

export interface NowData {
  updated: string // "2026-05"
  items: NowItem[]
}

// ─── Full content bundle (used by ContentContext) ─────────────────────────────

export interface ContentBundle {
  site: SiteData
  hero: HeroData
  projects: Project[]
  about: AboutData
  contact: ContactData
  experience: ExperienceData
  now: NowData
}
