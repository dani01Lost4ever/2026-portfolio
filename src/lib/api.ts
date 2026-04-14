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
  SiteData, HeroData, Project, AboutData, ContactData, ExperienceData, ContentBundle,
} from './types'

import siteJson       from '../data/site.json'
import heroJson       from '../data/hero.json'
import projectsJson   from '../data/projects.json'
import aboutJson      from '../data/about.json'
import contactJson    from '../data/contact.json'
import experienceJson from '../data/experience.json'

// ─── helpers ──────────────────────────────────────────────────────────────────

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback
  if (typeof value === 'string') {
    try { return JSON.parse(value) } catch { return fallback }
  }
  return value as T
}

function stripHtml(value: string): string {
  if (!/[<>]/.test(value)) return value
  if (typeof document === 'undefined') return value.replace(/<[^>]*>/g, ' ')
  const el = document.createElement('div')
  el.innerHTML = value
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function parseText(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback
  const text = stripHtml(value).trim()
  return text || fallback
}

function parseTextArray(value: unknown, fallback: string[]): string[] {
  if (value == null) return fallback

  const parsed = parseJson<unknown>(value, fallback)

  if (Array.isArray(parsed)) {
    return parsed.map(v => parseText(v, '')).filter(Boolean)
  }

  if (typeof parsed === 'string') {
    const text = parseText(parsed, '')
    if (!text) return fallback
    return text
      .split(/[\n,;|]/)
      .map(s => s.trim())
      .filter(Boolean)
  }

  return fallback
}

// ─── site_settings ────────────────────────────────────────────────────────────

export async function fetchSite(): Promise<SiteData> {
  try {
    const r = await pb.collection('site_settings').getFirstListItem('')
    return {
      logo: parseText(r['logo'], siteJson.logo),
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
      name:             parseText(r['name'], heroJson.name),
      location:         parseText(r['location'], heroJson.location),
      taglines:         parseTextArray(r['taglines'], heroJson.taglines),
      subtitle:         parseText(r['subtitle'], heroJson.subtitle),
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
      slug:        parseText(r['slug'], ''),
      year:        parseText(r['year'], ''),
      title:       parseText(r['title'], ''),
      subtitle:    parseText(r['subtitle'], ''),
      description: parseText(r['description'], ''),
      overview:    parseText(r['overview'], ''),
      challenge:   parseText(r['challenge'], ''),
      solution:    parseText(r['solution'], ''),
      tags:        parseTextArray(r['tags'], []),
      gradient:    parseText(r['gradient'], ''),
      results:     parseJson(r['results'],  []),
      role:        parseText(r['role'], ''),
      timeline:    parseText(r['timeline'], ''),
      link:        parseText(r['link'], '') || undefined,
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
      slug:        parseText(r['slug'], ''),
      year:        parseText(r['year'], ''),
      title:       parseText(r['title'], ''),
      subtitle:    parseText(r['subtitle'], ''),
      description: parseText(r['description'], ''),
      overview:    parseText(r['overview'], ''),
      challenge:   parseText(r['challenge'], ''),
      solution:    parseText(r['solution'], ''),
      tags:        parseTextArray(r['tags'], []),
      gradient:    parseText(r['gradient'], ''),
      results:     parseJson(r['results'],  []),
      role:        parseText(r['role'], ''),
      timeline:    parseText(r['timeline'], ''),
      link:        parseText(r['link'], '') || undefined,
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
      label:   parseText(r['label'], aboutJson.label),
      heading: parseText(r['heading'], aboutJson.heading),
      bio:     parseTextArray(r['bio'], aboutJson.bio),
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
      label:         parseText(r['label'], contactJson.label),
      heading:       parseText(r['heading'], contactJson.heading),
      headingAccent: parseText(r['heading_accent'], contactJson.headingAccent),
      availability:  parseText(r['availability'], contactJson.availability),
      email:         parseText(r['email'], contactJson.email),
      socials:       parseJson(r['socials'], contactJson.socials),
      copyright:     parseText(r['copyright'], contactJson.copyright),
    }
  } catch {
    return contactJson as ContactData
  }
}

// ─── project views ────────────────────────────────────────────────────────────

/**
 * Increments the view count for a project and returns the new total.
 * Silently returns 0 if PocketBase is unreachable.
 */
export async function incrementProjectViews(slug: string): Promise<number> {
  try {
    const r = await pb.collection('projects').getFirstListItem(`slug="${slug}"`)
    const views = ((r['views'] as number | undefined) ?? 0) + 1
    await pb.collection('projects').update(r.id, { views })
    return views
  } catch {
    return 0
  }
}

// ─── contact messages ─────────────────────────────────────────────────────────

export interface MessagePayload {
  name: string
  email: string
  message: string
}

/**
 * Saves a contact form submission to the `messages` collection in PocketBase.
 * Throws if the write fails (caller should handle the error).
 */
export async function sendMessage(payload: MessagePayload): Promise<void> {
  await pb.collection('messages').create(payload)
}

// ─── experience ───────────────────────────────────────────────────────────────

export async function fetchExperience(): Promise<ExperienceData> {
  try {
    const [workRecords, eduRecords] = await Promise.all([
      pb.collection('work_experience').getFullList({ sort: '+order' }),
      pb.collection('education').getFullList({ sort: '+order' }),
    ])

    return {
      work: workRecords.map(r => ({
        company:         r['company']          ?? '',
        companyDuration: r['company_duration'] ?? '',
        roles:           parseJson(r['roles'], []),
      })),
      education: eduRecords.map(r => ({
        school: r['school']        ?? '',
        degree: r['degree']        ?? '',
        field:  r['field_of_study'] ?? '',
        period: r['period']        ?? '',
        grade:  r['grade']         || undefined,
        tags:   parseJson(r['tags'], []),
      })),
    }
  } catch {
    return experienceJson as ExperienceData
  }
}

// ─── full bundle ──────────────────────────────────────────────────────────────

export async function fetchAllContent(): Promise<ContentBundle> {
  const [site, hero, projects, about, contact, experience] = await Promise.all([
    fetchSite(),
    fetchHero(),
    fetchProjects(),
    fetchAbout(),
    fetchContact(),
    fetchExperience(),
  ])
  return { site, hero, projects, about, contact, experience }
}

