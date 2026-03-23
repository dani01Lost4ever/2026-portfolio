/**
 * fix-rules.mjs — Set public read rules on all portfolio collections.
 *
 *   node scripts/fix-rules.mjs --email <email> --password <password>
 */

const args     = process.argv.slice(2)
const get      = (f) => { const i = args.indexOf(f); return i !== -1 ? args[i + 1] : null }
const PB_URL   = get('--url')      ?? 'http://127.0.0.1:8090'
const EMAIL    = get('--email')    ?? ''
const PASSWORD = get('--password') ?? ''

if (!EMAIL || !PASSWORD) {
  console.error('Usage: node scripts/fix-rules.mjs --email <email> --password <password>')
  process.exit(1)
}

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
  const json = text ? JSON.parse(text) : {}
  if (!res.ok) throw new Error(`${method} /${path} → ${res.status}: ${JSON.stringify(json)}`)
  return json
}

// Authenticate as superuser
const { token } = await req(null, 'POST', 'collections/_superusers/auth-with-password', {
  identity: EMAIL, password: PASSWORD,
})
console.log('✓ Authenticated')

// Fetch all collections
const { items } = await req(token, 'GET', 'collections?perPage=100')
const portfolioCollections = ['site_settings', 'hero_content', 'projects', 'about_content', 'contact_content']
const targets = items.filter(c => portfolioCollections.includes(c.name))

for (const col of targets) {
  await req(token, 'PATCH', `collections/${col.id}`, {
    listRule: '',   // "" = allow everyone
    viewRule: '',
  })
  console.log(`  ✓ ${col.name} → public read`)
}

console.log('\nDone. Collections are now publicly readable.')
