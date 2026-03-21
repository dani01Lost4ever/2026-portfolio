/**
 * seed.mjs — Bootstrap PocketBase with collections and initial data.
 *
 * Run once after starting PocketBase for the first time:
 *
 *   node scripts/seed.mjs --email admin@example.com --password yourpassword
 *
 * Compatible with PocketBase v0.22+
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root      = resolve(__dirname, '..')

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args     = process.argv.slice(2)
const get      = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null }
const PB_URL   = get('--url')      ?? 'http://127.0.0.1:8090'
const EMAIL    = get('--email')    ?? ''
const PASSWORD = get('--password') ?? ''

if (!EMAIL || !PASSWORD) {
  console.error('Usage: node scripts/seed.mjs --email <email> --password <password>')
  process.exit(1)
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'))

async function req(token, method, path, body) {
  const res = await fetch(`${PB_URL}/api/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} /api/${path} → ${res.status}: ${text}`)
  return text ? JSON.parse(text) : null
}

async function reqSafe(token, method, path, body) {
  try { return await req(token, method, path, body) } catch { return null }
}

// ─── auth (PocketBase v0.22+ uses _superusers collection) ─────────────────────

async function authenticate() {
  console.log('🔐 Authenticating…')
  const data = await req(null, 'POST', 'collections/_superusers/auth-with-password', {
    identity: EMAIL,
    password: PASSWORD,
  })
  console.log('   ✓ Authenticated')
  return data.token
}

// ─── collection field builders ────────────────────────────────────────────────

const f = {
  text:   (name, opts = {}) => ({ name, type: 'text',   required: false, ...opts }),
  bool:   (name, opts = {}) => ({ name, type: 'bool',   required: false, ...opts }),
  number: (name, opts = {}) => ({ name, type: 'number', required: false, ...opts }),
  json:   (name)            => ({ name, type: 'json',   required: false, maxSize: 5000000 }),
  url:    (name)            => ({ name, type: 'url',    required: false, exceptDomains: [], onlyDomains: [] }),
  editor: (name)            => ({ name, type: 'editor', required: false, convertUrls: false }),
}

// ─── collection definitions ───────────────────────────────────────────────────

const COLLECTIONS = [
  {
    name: 'site_settings',
    fields: [
      f.text('logo'),
      f.json('nav'),
    ],
  },
  {
    name: 'hero_content',
    fields: [
      f.bool('available_for_work'),
      f.text('name'),
      f.text('location'),
      f.json('taglines'),
      f.editor('subtitle'),
      f.json('cta'),
      f.json('stats'),
    ],
  },
  {
    name: 'projects',
    fields: [
      f.text('display_id'),
      f.text('slug'),
      f.text('year'),
      f.text('title'),
      f.text('subtitle'),
      f.editor('description'),
      f.editor('overview'),
      f.editor('challenge'),
      f.editor('solution'),
      f.json('tags'),
      f.text('gradient'),
      f.json('results'),
      f.text('role'),
      f.text('timeline'),
      f.url('link'),
      f.number('order'),
    ],
  },
  {
    name: 'about_content',
    fields: [
      f.text('label'),
      f.text('heading'),
      f.json('bio'),
      f.json('skills'),
    ],
  },
  {
    name: 'contact_content',
    fields: [
      f.text('label'),
      f.text('heading'),
      f.text('heading_accent'),
      f.text('availability'),
      f.text('email'),
      f.json('socials'),
      f.text('copyright'),
    ],
  },
]

// ─── create collections ───────────────────────────────────────────────────────

async function ensureCollections(token) {
  console.log('\n📦 Creating collections…')
  for (const col of COLLECTIONS) {
    const existing = await reqSafe(token, 'GET', `collections/${col.name}`)
    if (existing) {
      console.log(`   ✓ ${col.name} already exists`)
    } else {
      await req(token, 'POST', 'collections', { name: col.name, type: 'base', fields: col.fields })
      console.log(`   + ${col.name} created`)
    }
  }
}

// ─── upsert helpers ───────────────────────────────────────────────────────────

async function upsertSingle(token, collection, data) {
  const list = await req(token, 'GET', `collections/${collection}/records?perPage=1`)
  if (list.items?.length > 0) {
    const id = list.items[0].id
    await req(token, 'PATCH', `collections/${collection}/records/${id}`, data)
    console.log(`   ~ ${collection} updated`)
  } else {
    await req(token, 'POST', `collections/${collection}/records`, data)
    console.log(`   + ${collection} seeded`)
  }
}

async function upsertProject(token, p, order) {
  const list = await req(token, 'GET', `collections/projects/records?filter=(slug='${p.slug}')&perPage=1`)
  const payload = {
    display_id:  p.id,
    slug:        p.slug,
    year:        p.year,
    title:       p.title,
    subtitle:    p.subtitle   ?? '',
    description: p.description ?? '',
    overview:    p.overview   ?? '',
    challenge:   p.challenge  ?? '',
    solution:    p.solution   ?? '',
    tags:        p.tags,
    gradient:    p.gradient   ?? '',
    results:     p.results,
    role:        p.role       ?? '',
    timeline:    p.timeline   ?? '',
    link:        (p.link && p.link !== '#') ? p.link : '',
    order,
  }
  if (list.items?.length > 0) {
    await req(token, 'PATCH', `collections/projects/records/${list.items[0].id}`, payload)
    console.log(`   ~ project "${p.title}" updated`)
  } else {
    await req(token, 'POST', 'collections/projects/records', payload)
    console.log(`   + project "${p.title}" created`)
  }
}

// ─── seed data ────────────────────────────────────────────────────────────────

async function seedData(token) {
  console.log('\n🌱 Seeding data from JSON files…')

  const site     = readJson('src/data/site.json')
  const hero     = readJson('src/data/hero.json')
  const projects = readJson('src/data/projects.json')
  const about    = readJson('src/data/about.json')
  const contact  = readJson('src/data/contact.json')

  await upsertSingle(token, 'site_settings', {
    logo: site.logo,
    nav:  site.nav,
  })

  await upsertSingle(token, 'hero_content', {
    available_for_work: hero.availableForWork,
    name:               hero.name,
    location:           hero.location,
    taglines:           hero.taglines,
    subtitle:           hero.subtitle,
    cta:                hero.cta,
    stats:              hero.stats,
  })

  for (const [i, p] of projects.entries()) {
    await upsertProject(token, p, i)
  }

  await upsertSingle(token, 'about_content', {
    label:   about.label,
    heading: about.heading,
    bio:     about.bio,
    skills:  about.skills,
  })

  await upsertSingle(token, 'contact_content', {
    label:          contact.label,
    heading:        contact.heading,
    heading_accent: contact.headingAccent,
    availability:   contact.availability,
    email:          contact.email,
    socials:        contact.socials,
    copyright:      contact.copyright,
  })
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  try {
    const token = await authenticate()
    await ensureCollections(token)
    await seedData(token)
    console.log(`\n✅ Done! Open the admin UI → ${PB_URL}/_/\n`)
  } catch (err) {
    console.error('\n❌ Failed:', err.message)
    process.exit(1)
  }
}

main()
