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

The home page's "Now" items have no collection: they always come from `src/data/now.json`
(`fetchAllContent()` in `src/lib/api.ts`).

### `site_settings`

| Field | Type | Description |
|-------|------|-------------|
| `logo` | text | Logo text shown in navbar |
| `nav` | json | Array of `{ label, href }` nav items |

### `hero_content`

| Field | Type | Description |
|-------|------|-------------|
| `available_for_work` | bool | Shows the contact's availability line |
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
| `gradient` | text | CSS gradient string. Still read into `Project.gradient`, but no longer used by the film, the project page or the poster colours |
| `results` | json | Array of `{ value, label }` metrics |
| `role` | text | Your role e.g. `"Lead Engineer"` |
| `timeline` | text | Duration e.g. `"6 months"` |
| `link` | url | Live site URL (optional) |
| `order` | number | Display order (ascending) |
| `shape` | select | The project's poster, in the film, the sheets and the project page. Valid values are the `ShapeId` union in `src/lib/types.ts`: `bug`, `loop`, `orbit`, `candles`, `globe`, `clocks`, `coins`, `browser`, `tictactoe`, `battleship`, `generic`. Optional — leave unset and the frontend resolves one for you, see below. |
| `layers` | json | Architecture layers, top to bottom, shown in the Architecture section of the project page: an array of `{ label, tech }` objects (4 expected), e.g. `{ "label": "API", "tech": "Express" }`. Optional, same fallback as `shape`. |
| `caption` | text | The project's one-line headline in the film (the case study headline for the lead project). Optional — falls back to `subtitle`. |

The `shape` select was added by `backend/pb_migrations/1790254698_updated_projects_visuals.js` with the
previous design's shapes; `1790340000_updated_projects_shape_posters.js` sets its values to the `ShapeId`
union above (`grid`, `clusters`, `helix`, `at` and `constellation` go, `generic` comes in) and first
clears the shape of any record still on a removed value. Its down migration restores the old values
and clears `generic`. The frontend still ignores any value outside `ShapeId` (`isShapeId()` in
`src/lib/projectVisuals.ts`, applied when the record is mapped in `src/lib/api.ts`) and falls back to
the registry, as if the field were empty.

#### How `shape` / `layers` / `caption` are resolved

These three fields are optional so existing and new PocketBase records don't
need to be filled in right away. `src/lib/projectVisuals.ts` exports
`visualsFor(project)`, which every project-rendering component should call
instead of reading `project.shape` etc. directly. For each field it resolves,
in order:

1. **The CMS value**, if present and valid (`shape` must be one of the known
   `ShapeId`s; `layers` must be a non-empty array of `{ label, tech }`
   objects; `caption` must be non-blank) — invalid values are ignored rather
   than crashing the page.
2. **A built-in registry**, keyed by `slug`, for the ten shipped projects.
3. **A generic fallback** for anything else: shape `generic`, 4 layers
   derived by chunking the project's `tags`, and `subtitle` (or `title`) as
   the caption.

A poster's colours come from the poster itself (`src/take/posters.ts`), not
from `gradient`.

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
