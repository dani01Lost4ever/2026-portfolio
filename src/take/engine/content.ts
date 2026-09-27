/**
 * content.ts — turns the CMS bundle into what the film shows. The film never reads the
 * bundle directly: every line it draws comes from here, so a PocketBase edit reaches it.
 */

import type { ContentBundle, Result, ShapeId } from '../../lib/types'
import { visualsFor } from '../../lib/projectVisuals'
import { cmsText, taglineLines } from '../../components/content'
import { posterFor } from '../posters'

const FULL_NAME = 'Daniel Busetto'
const STACK_COLOURS = ['#E4572E', '#0B0B0C', '#2F6B4F', '#2E5BBA']
const NOW_COLOURS = ['#EF6A21', '#2E5BBA', '#1C7446', '#6B3B8E']

export interface TakeProject {
  n: string
  slug: string
  title: string
  sub: string
  year: string
  role: string
  shape: ShapeId
  sym: string
  bg: string
  light: boolean
  caption: string
  description: string
  tags: string[]
  results: Result[]
  link?: string
}

export interface ExpRow { a: string; b: string; s: number; e: number; edu: boolean; now: boolean }
export interface Stack { n: string; c: string; s: string }
export interface NowCard { k: string; v: string; c: string; i: string }

export interface TakeContent {
  wordmark: string
  fullName: string
  role: string
  tagline: string
  location: string
  projects: TakeProject[]
  /** The case study the film plays: the first project. */
  lead: string
  expIntro: string
  exp: ExpRow[]
  expFrom: number
  expTo: number
  aboutHeading: string
  aboutBody: string
  stacks: Stack[]
  now: NowCard[]
  track: { title: string; artist: string } | null
  email: string
  github: string | null
  /** The CMS's "available for work" switch; off hides the availability line and the chip. */
  available: boolean
  availability: string
  /** Short brand for narrow screens (the CMS logo, e.g. "DB"). */
  logo: string
  placardLine: string
  year: number
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/** "Jul 2024" → 2024.5; "Present" → today; a bare year → its middle when it ends a period. */
function when(s: string, end: boolean, today: number): number | null {
  const t = s.trim().toLowerCase()
  if (/present|now|today|current/.test(t)) return today
  const m = t.match(/([a-z]{3})[a-z]*\.?\s+(\d{4})/)
  if (m) { const mi = MONTHS.indexOf(m[1]); return +m[2] + (mi < 0 ? 0 : mi) / 12 + (end ? 1 / 12 : 0) }
  const y = t.match(/(\d{4})/)
  return y ? +y[1] + (end ? 0.5 : 0) : null
}

/** A compact period: "Apr — Jun 2023", "Jul 2023 — Jul 2024", "Jul 2024 — now", "2020 — 22". */
function shortPeriod(p: string): string {
  const parts = p.split(/\s+[—–-]\s+/)
  if (parts.length < 2) return p
  const a = parts[0].trim(), b = parts[1].trim()
  if (/present|now|current/i.test(b)) return `${a} — now`
  const ya = a.match(/\d{4}/)?.[0], yb = b.match(/\d{4}/)?.[0]
  if (ya && yb && ya === yb) return `${a.replace(ya, '').trim()} — ${b}`
  if (/^\d{4}$/.test(a) && /^\d{4}$/.test(b)) return `${a} — ${b.slice(2)}`
  return `${a} — ${b}`
}

function period(p: string, today: number): [number, number] | null {
  const parts = p.split(/\s+[—–-]\s+/)
  if (parts.length < 2) return null
  const s = when(parts[0], false, today), e = when(parts[1], true, today)
  return s != null && e != null && e > s ? [s, e] : null
}

/** 'ITS DIGITAL ACADEMY "Mario Volpato"' → 'ITS Digital Academy'. */
function shortSchool(s: string): string {
  return s.replace(/["“”][^"“”]*["“”]/g, '').trim().split(/\s+/)
    .map(w => (w.length > 3 && w === w.toUpperCase() ? w[0] + w.slice(1).toLowerCase() : w)).join(' ')
}

/** First sentence, trimmed at a word near `max` characters. */
function firstSentence(s: string, max = 190): string {
  const m = s.match(/^.+?[.!?](\s|$)/)
  let out = (m ? m[0] : s).trim()
  if (out.length > max) out = out.slice(0, out.lastIndexOf(' ', max)).replace(/[,;:—–-]\s*$/, '') + '…'
  return out
}

function nowBadge(label: string): string {
  const verb = label.replace(/^now\s+/i, '').toLowerCase()
  if (verb.startsWith('build')) return 'dev'
  if (verb.startsWith('read')) return 'read'
  if (verb.startsWith('ship')) return 'ship'
  return verb.slice(0, 4)
}

function githubProfile(b: ContentBundle): string | null {
  const s = b.contact.socials.find(x => /github/i.test(x.label) && /^https?:\/\//.test(x.href))
  if (s) return s.href
  for (const p of b.projects) {
    const m = p.link?.match(/^https?:\/\/(www\.)?github\.com\/([^/]+)/i)
    if (m) return `https://github.com/${m[2]}`
  }
  return null
}

export function takeContent(b: ContentBundle, date = new Date()): TakeContent {
  const today = date.getFullYear() + date.getMonth() / 12 + date.getDate() / 365
  const ordered = [...b.projects].sort((x, y) => (x.order ?? 0) - (y.order ?? 0))
  const projects: TakeProject[] = ordered.map((p, i) => {
    const v = visualsFor(p), poster = posterFor(v.shape)
    return {
      n: p.id || String(i + 1).padStart(2, '0'), slug: p.slug, title: p.title, sub: p.subtitle, year: p.year, role: p.role,
      shape: v.shape, sym: poster.sym, bg: poster.bg, light: poster.light,
      caption: v.caption, description: p.description, tags: p.tags, results: p.results.slice(0, 3), link: p.link,
    }
  })

  // experience: every role, and the schooling that overlaps the working years
  const rows: ExpRow[] = []
  for (const w of b.experience.work) for (const r of w.roles) {
    const pr = period(r.period, today)
    if (!pr) continue
    const type = r.type && !/full-time/i.test(r.type) ? `${r.type.toLowerCase()} · ` : ''
    rows.push({ a: r.role, b: `${w.company} · ${type}${shortPeriod(r.period)}`, s: pr[0], e: pr[1], edu: false, now: /present/i.test(r.period) })
  }
  const firstWork = rows.length ? Math.min(...rows.map(r => r.s)) : today
  let lastEdu: { field: string; school: string; grade?: string } | null = null, lastEduEnd = -Infinity
  for (const e of b.experience.education) {
    if (/high school/i.test(e.degree)) continue
    const pr = period(e.period, today)
    if (!pr) continue
    const years = `${Math.floor(pr[0])} — ${String(Math.floor(pr[1])).slice(2)}`
    rows.push({ a: e.field, b: `${shortSchool(e.school)} · ${e.grade || years}`, s: pr[0], e: pr[1], edu: true, now: false })
    if (pr[1] > lastEduEnd) { lastEduEnd = pr[1]; lastEdu = { field: e.field, school: shortSchool(e.school), grade: e.grade } }
  }
  rows.sort((x, y) => x.s - y.s)
  const exp = rows.slice(-6)
  const company = b.experience.work[0]?.company
  const expIntro = company
    ? `${company} since ${Math.floor(firstWork)}${lastEdu ? `, after ${lastEdu.field} at ${lastEdu.school}${lastEdu.grade ? `, ${lastEdu.grade}` : ''}` : ''}.`
    : ''

  const stacks = b.about.skills.slice(0, 4).map((g, i) => ({ n: g.category, c: STACK_COLOURS[i % 4], s: g.items.join(' · ') }))
  const listening = b.now.items.find(x => /listen/i.test(x.label))
  const [artist, title] = listening ? listening.value.split(/\s+[—–-]\s+/) : []
  const skills = [...(b.about.skills[0]?.items.slice(0, 2) ?? []), ...(b.about.skills[1]?.items.slice(0, 2) ?? [])]
  const role = cmsText(b.about.heading).split(/[,.]/)[0] || 'Full-stack developer'
  const lines = taglineLines(b.hero.taglines)

  return {
    wordmark: (cmsText(b.hero.name) || 'daniel').toLowerCase().replace(/[^a-zà-ÿ]/g, '') || 'daniel',
    fullName: FULL_NAME,
    role,
    tagline: lines.slice(0, 2).join(' ').replace(/[,.;:—–-]\s*$/, '') || role,
    location: cmsText(b.hero.location) || 'Venice',
    projects,
    lead: projects[0] ? firstSentence(ordered[0].description) : '',
    expIntro,
    exp,
    expFrom: exp.length ? Math.floor(Math.min(...exp.map(r => r.s))) : Math.floor(today) - 3,
    expTo: today + 0.25,
    aboutHeading: cmsText(b.about.heading),
    aboutBody: cmsText(b.about.bio[1] ?? b.about.bio[0] ?? ''),
    stacks,
    now: b.now.items.filter(x => x !== listening).slice(0, 3).map((x, i) => ({ k: x.label.toUpperCase(), v: x.value, c: NOW_COLOURS[i % 4], i: nowBadge(x.label) })),
    track: listening && title ? { title, artist } : null,
    email: b.contact.email,
    github: githubProfile(b),
    available: b.hero.availableForWork !== false,
    availability: b.hero.availableForWork !== false ? cmsText(b.contact.availability) : '',
    logo: cmsText(b.site.logo) || 'DB',
    placardLine: `${role}. ${skills.join(', ')}${skills.length ? '.' : ''}`,
    year: date.getFullYear(),
  }
}
