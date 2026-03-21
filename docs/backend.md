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

---

## Backups

The entire database lives in:
```
backend/pb_data/data.db
```

Back this file up regularly. It is listed in `.gitignore` — do not commit it.
