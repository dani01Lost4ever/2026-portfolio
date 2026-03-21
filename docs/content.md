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

**Via JSON:**
1. Add an entry to `src/data/projects.json`
2. Run `npm run seed …`

---

### Toggle "Available for work"

- Admin UI: `hero_content` → toggle `available_for_work`
- JSON: set `"availableForWork": false` in `src/data/hero.json`, then re-seed

---

### Update social links

- Admin UI: `contact_content` → edit `socials` JSON field
- JSON: edit the `socials` array in `src/data/contact.json`, then re-seed

---

### Change the navbar logo text

- Admin UI: `site_settings` → `logo` field
- JSON: `src/data/site.json` → `"logo"` key

---

## JSON file reference

| File | Controls |
|------|----------|
| `src/data/site.json` | Logo, nav links |
| `src/data/hero.json` | Name, taglines, CTA buttons, stats, availability |
| `src/data/projects.json` | All project cards and case studies |
| `src/data/about.json` | Bio paragraphs, skill groups |
| `src/data/contact.json` | Email, socials, footer copyright |
