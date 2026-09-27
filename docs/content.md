# Editing Content

There are two ways to edit content — both work, choose whichever suits the situation.

---

## Option A — Admin UI (recommended for day-to-day)

1. Make sure PocketBase is running: `npm run pb`
2. Open `http://127.0.0.1:8090/_/`
3. Log in with your superadmin credentials
4. Click on the collection you want to edit (e.g. `projects`)
5. Click a record → edit fields → **Save**

Changes are live immediately. No code change or rebuild needed.

---

## Option B — JSON files (good for bulk edits / version control)

Edit the files in `src/data/` directly, then re-run the seed to push them to PocketBase:

```bash
npm run seed -- --email admin@example.com --password yourpassword
```

The seed script is **upsert** — it updates existing records, not duplicates.

---

## Common tasks

### Add a new project

**Via admin UI:**
1. Go to `projects` collection
2. Click **New record**
3. Fill in all fields (see [backend.md](./backend.md) for field descriptions)
4. Set `order` to the number you want it to appear in (0-based)
5. Save

`shape`, `layers` and `caption` can be left blank:

- `shape` is the project's poster (in the film, the sheets and the project
  page). Valid values are the `ShapeId` union in `src/lib/types.ts`; any
  other value is ignored.
- `layers` feed the Architecture section of the project page (4
  `{ label, tech }` rows, top to bottom).
- `caption` is the project's one-line headline in the film.

`visualsFor()` in `src/lib/projectVisuals.ts` fills in blank or invalid
values from a built-in registry (for the ten shipped projects) or from the
project's own tags and subtitle (for anything new). Fill them in only when
you want to override that default, e.g. to give a brand-new project one of
the existing posters instead of the `generic` one. `gradient` is not used
for any colour any more; posters carry their own.

The first project (lowest `order`) is the case study the film plays, and
the first nine get a tile in the film's work grid; every project is in the
project sheet and has its own page.

**Via JSON:**
1. Add an entry to `src/data/projects.json`
2. Run `npm run seed …`

---

### Toggle "Available for work"

- Admin UI: `hero_content` → toggle `available_for_work`
- JSON: set `"availableForWork": false` in `src/data/hero.json`, then re-seed

On: a green "Available for work" chip next to the name in the film's header and the page header, and the contact card, the contact sheet and the reading page show `contact_content.availability`. Off: no chip and no availability line.

---

### Update social links

- Admin UI: `contact_content` → edit `socials` JSON field
- JSON: edit the `socials` array in `src/data/contact.json`, then re-seed

---

### Change the short brand and the page header's links

- Admin UI: `site_settings` → `logo` (the short brand, e.g. `DB`, shown instead of the full name on screens narrower than 520px) and `nav` (the links on the right of the page header on `/project/:slug` and the 404; an `href` like `/#work` jumps to that film chapter; the last link is drawn as a pill)
- JSON: `src/data/site.json` → `"logo"` and `"nav"` keys

---

## JSON file reference

| File | Controls |
|------|----------|
| `src/data/site.json` | Logo, nav links |
| `src/data/hero.json` | Name, taglines, CTA buttons, stats, availability |
| `src/data/projects.json` | All project cards and case studies |
| `src/data/about.json` | Bio paragraphs, skill groups |
| `src/data/contact.json` | Email, socials, footer copyright |
| `src/data/experience.json` | Work roles and education |
| `src/data/now.json` | The film's "Now" chapter (JSON only: no PocketBase collection, no re-seed needed, but a rebuild is) |
