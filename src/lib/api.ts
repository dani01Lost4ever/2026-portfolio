/**
 * api.ts — all data fetching from PocketBase.
 *
 * Each function maps PocketBase records to the same shapes the JSON
 * files use, so components are unaware of the data source.
 *
 * If PocketBase is unreachable, every function silently falls back to
 * the local JSON file — the site always renders something useful.
 *
 * PocketBase collections:
 *   site_settings   (1 record)  →  SiteData
 *   hero_content    (1 record)  →  HeroData
 *   projects        (N records) →  Project[]
 *   about_content   (1 record)  →  AboutData
 *   contact_content (1 record)  →  ContactData
 */

import pb from './pb'
import type {
  SiteData, HeroData, Project, AboutData, ContactData, ContentBundle,
} from './types'

import siteJson     from '../data/site.json'
import heroJson     from '../data/hero.json'
import projectsJson from '../data/projects.json'
import aboutJson    from '../data/about.json'
import contactJson  from '../data/contact.json'

// ─── helpers ──────────────────────────────────────────────────────────────────

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback
  if (typeof value === 'string') {
    try { return JSON.parse(value) } catch { return fallback }
  }
  return value as T
}

// ─── site_settings ────────────────────────────────────────────────────────────

export async function fetchSite(): Promise<SiteData> {
  try {
    const r = await pb.collection('site_settings').getFirstListItem('')
    return {
      logo: r['logo'] ?? siteJson.logo,
      nav:  parseJson(r['nav'], siteJson.nav),
    }
  } catch {
    return siteJson as SiteData
  }
}

// ─── hero_content ─────────────────────────────────────────────────────────────

export async function fetchHero(): Promise<HeroData> {
  try {
    const r = await pb.collection('hero_content').getFirstListItem('')
    return {
      availableForWork: r['available_for_work'] ?? heroJson.availableForWork,
      name:             r['name']               ?? heroJson.name,
      location:         r['location']           ?? heroJson.location,
      taglines:         parseJson(r['taglines'], heroJson.taglines),
      subtitle:         r['subtitle']           ?? heroJson.subtitle,
      cta:              parseJson(r['cta'],      heroJson.cta),
      stats:            parseJson(r['stats'],    heroJson.stats),
    }
  } catch {
    return heroJson as HeroData
  }
}

// ─── projects ─────────────────────────────────────────────────────────────────

export async function fetchProjects(): Promise<Project[]> {
  try {
    const records = await pb.collection('projects').getFullList({ sort: '+order' })
    return records.map((r, i) => ({
      id:          r['display_id']          ?? String(i + 1).padStart(2, '0'),
      slug:        r['slug'],
      year:        r['year'],
      title:       r['title'],
      subtitle:    r['subtitle']            ?? '',
      description: r['description']         ?? '',
      overview:    r['overview']            ?? '',
      challenge:   r['challenge']           ?? '',
      solution:    r['solution']            ?? '',
      tags:        parseJson(r['tags'],     []),
      gradient:    r['gradient']            ?? '',
      results:     parseJson(r['results'],  []),
      role:        r['role']                ?? '',
      timeline:    r['timeline']            ?? '',
      link:        r['link']                || undefined,
      order:       r['order']               ?? i,
    }))
  } catch {
    return (projectsJson as Omit<Project, 'order'>[]).map((p, i) => ({ ...p, order: i }))
  }
}

export async function fetchProjectBySlug(slug: string): Promise<Project | null> {
  try {
    const r = await pb.collection('projects').getFirstListItem(`slug="${slug}"`)
    return {
      id:          r['display_id']          ?? r.id,
      slug:        r['slug'],
      year:        r['year'],
      title:       r['title'],
      subtitle:    r['subtitle']            ?? '',
      description: r['description']         ?? '',
      overview:    r['overview']            ?? '',
      challenge:   r['challenge']           ?? '',
      solution:    r['solution']            ?? '',
      tags:        parseJson(r['tags'],     []),
      gradient:    r['gradient']            ?? '',
      results:     parseJson(r['results'],  []),
      role:        r['role']                ?? '',
      timeline:    r['timeline']            ?? '',
      link:        r['link']                || undefined,
      order:       r['order']               ?? 0,
    }
  } catch {
    const fallback = (projectsJson as Omit<Project, 'order'>[]).find(p => p.slug === slug)
    return fallback ? { ...fallback, order: 0 } : null
  }
}

// ─── about_content ────────────────────────────────────────────────────────────

export async function fetchAbout(): Promise<AboutData> {
  try {
    const r = await pb.collection('about_content').getFirstListItem('')
    return {
      label:   r['label']               ?? aboutJson.label,
      heading: r['heading']             ?? aboutJson.heading,
      bio:     parseJson(r['bio'],      aboutJson.bio),
      skills:  parseJson(r['skills'],   aboutJson.skills),
    }
  } catch {
    return aboutJson as AboutData
  }
}

// ─── contact_content ──────────────────────────────────────────────────────────

export async function fetchContact(): Promise<ContactData> {
  try {
    const r = await pb.collection('contact_content').getFirstListItem('')
    return {
      label:         r['label']              ?? contactJson.label,
      heading:       r['heading']            ?? contactJson.heading,
      headingAccent: r['heading_accent']     ?? contactJson.headingAccent,
      availability:  r['availability']       ?? contactJson.availability,
      email:         r['email']              ?? contactJson.email,
      socials:       parseJson(r['socials'], contactJson.socials),
      copyright:     r['copyright']          ?? contactJson.copyright,
    }
  } catch {
    return contactJson as ContactData
  }
}

// ─── full bundle ──────────────────────────────────────────────────────────────

export async function fetchAllContent(): Promise<ContentBundle> {
  const [site, hero, projects, about, contact] = await Promise.all([
    fetchSite(),
    fetchHero(),
    fetchProjects(),
    fetchAbout(),
    fetchContact(),
  ])
  return { site, hero, projects, about, contact }
}
