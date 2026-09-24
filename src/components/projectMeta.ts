import type { Project } from '../lib/types'

/** The short meta line above a project title: year, then role parts. */
export function projectMeta(p: Project): string[] {
  const parts = p.role.split(/\s+[—–-]\s+/).map(s => s.trim()).filter(Boolean)
  const meta = [p.year, ...parts].filter(Boolean)
  if (parts.length < 2 && p.timeline && p.timeline !== p.year) meta.push(p.timeline)
  return meta
}

/** A plain label for a project's external link, from where it points. */
export function linkLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    if (host === 'github.com') return 'View on GitHub'
    if (host === 'npmjs.com') return 'View on npm'
    return 'Visit the site'
  } catch {
    return 'Visit the site'
  }
}
