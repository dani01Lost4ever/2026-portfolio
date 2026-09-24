# Backend — PocketBase

## First-time Setup

### 1. Create superadmin account

```bash
npm run pb:admin admin@example.com yourpassword
```

This writes credentials into `backend/pb_data/` — run it **once**.

### 2. Start PocketBase

```bash
npm run pb
```

PocketBase is now running at:
- **REST API** → `http://127.0.0.1:8090/api/`
- **Admin UI** → `http://127.0.0.1:8090/_/`

### 3. Seed initial data

```bash
npm run seed -- --email admin@example.com --password yourpassword
```

This creates all collections and populates them from your JSON files.
It is **idempotent** — safe to run multiple times.

---

## Collections

All collections are treated as **singletons** (one record each) except `projects`.

### `site_settings`

| Field | Type | Description |
|-------|------|-------------|
| `logo` | text | Logo text shown in navbar |
| `nav` | json | Array of `{ label, href }` nav items |

### `hero_content`

| Field | Type | Description |
|-------|------|-------------|
| `available_for_work` | bool | Shows "Available for work" badge |
| `name` | text | Your name |
| `location` | text | City / country |
| `taglines` | json | Array of 3 heading lines |
| `subtitle` | text | Short bio below heading |
| `cta` | json | Array of `{ label, href, variant }` buttons |
| `stats` | json | Array of `{ value, label }` stat items |

### `projects`

| Field | Type | Description |
|-------|------|-------------|
| `display_id` | text | Visual ID shown on card e.g. `"01"` |
| `slug` | text | URL-safe identifier (unique) |
| `year` | text | Year string e.g. `"2025"` |
| `title` | text | Project title |
| `subtitle` | text | One-line description |
| `description` | text | Card description |
| `overview` | text | Case study overview paragraph |
| `challenge` | text | Challenge section |
| `solution` | text | Solution section |
| `tags` | json | Array of tech/tool strings |
| `gradient` | text | CSS gradient string for cover |
| `results` | json | Array of `{ value, label }` metrics |
| `role` | text | Your role e.g. `"Lead Engineer"` |
| `timeline` | text | Duration e.g. `"6 months"` |
| `link` | url | Live site URL (optional) |
| `order` | number | Display order (ascending) |
| `views` | number | View counter — only changed via the view route, see [Project view counter](#project-view-counter) |

### `about_content`

| Field | Type | Description |
|-------|------|-------------|
| `label` | text | Section label |
| `heading` | text | Main heading |
| `bio` | json | Array of paragraph strings |
| `skills` | json | Array of `{ category, items[] }` |

### `contact_content`

| Field | Type | Description |
|-------|------|-------------|
| `label` | text | Section label |
| `heading` | text | Main heading line |
| `heading_accent` | text | Accent heading line (coloured) |
| `availability` | text | Availability blurb |
| `email` | text | Contact email |
| `socials` | json | Array of `{ label, href }` |
| `copyright` | text | Footer copyright string |

---

## Admin UI

Open `http://127.0.0.1:8090/_/` and log in with your superadmin credentials.

From there you can:
- Edit any record directly in the table view
- Add / remove projects
- Toggle availability status
- Update social links, email, bio, etc.

Changes reflect on the live site **immediately** — no rebuild required.

---

## API Rules

By default PocketBase collections are **public read, private write**.
This means:
- The frontend can fetch content without authentication ✓
- Only the superadmin can create / update / delete records ✓

If you want to lock down reads too, set **List/View rules** in the admin UI to:
```
@request.auth.id != ""
```

> Keep the `projects` **Update rule** empty/locked (`null`, superusers only).
> The view counter does **not** need it — see below.

---

## Project view counter

The project detail page shows a view count. Visitors are anonymous and
`projects.updateRule` is `null`, so the frontend **cannot** PATCH the record
(that used to fail with a 403 and the counter stayed at 0). Instead a
PocketBase JS hook exposes a dedicated route:

```
POST /api/projects/{slug}/view
→ 200 { "views": 42, "counted": true }
→ 404 unknown slug
```

- **Hook:** `backend/pb_hooks/views.pb.js`
- **Frontend:** `incrementProjectViews(slug)` in `src/lib/api.ts` calls it with
  `pb.send(...)`, called from `src/pages/ProjectDetail.tsx`. Any failure
  (PocketBase down, 404, old backend without the hook) returns `0` and the
  page just hides the counter.

How it works:

1. The hook runs a single SQL
   `UPDATE projects SET views = COALESCE(views, 0) + 1 WHERE slug = ?` inside a
   transaction and reads back the new total. The increment is atomic, so
   concurrent views never overwrite each other. It bypasses record
   hooks/realtime events on purpose.
2. **Why this is safe:** the only input is the slug in the URL, bound as a
   query parameter. The route can do one thing: add 1 to `views` of a project
   that already exists. Visitors still can't create, edit or delete project
   content, and the collection rules stay unchanged.
3. **Rate limiting:** each client IP counts at most **once per project per
   60 s** (`VIEW_WINDOW_MS` in the hook). Repeat requests inside the window
   still get `200` with the current total and `counted: false`. This absorbs
   refresh spam and React StrictMode's double effect in dev. The window is kept
   in PocketBase's in-memory app store (claimed atomically, pruned by a cron
   every 10 min) and resets when PocketBase restarts.

### Behind a reverse proxy

The client IP comes from `e.realIP()`. Behind a proxy (Caddy, Nginx,
Cloudflare…) PocketBase only trusts forwarded headers you have configured
under **Dashboard → Settings → Application → User IP proxy headers**
(e.g. `X-Forwarded-For` / `CF-Connecting-IP`). Without that, every visitor
shares the proxy's IP, so the whole site counts at most one view per project
per minute. Set it up in production.

### Shipping the hook

PocketBase loads `pb_hooks/` next to its binary. `backend/Dockerfile` copies
`backend/pb_hooks` to `/pb/pb_hooks`, so **rebuild and redeploy the
`pocketbase` image** for the route to exist. Locally, `npm run pb` (run from
`backend/`) picks up `backend/pb_hooks` automatically. PocketBase restarts
itself when a hook file changes.

Quick check:

```bash
curl -X POST http://127.0.0.1:8090/api/projects/bugpilot/view
# {"counted":true,"views":1}
```

---

## Backups

The entire database lives in:
```
backend/pb_data/data.db
```

Back this file up regularly. It is listed in `.gitignore` — do not commit it.
