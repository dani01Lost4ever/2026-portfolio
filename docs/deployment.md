# Deployment

## Frontend (Vite → static)

The React app compiles to plain HTML/CSS/JS and can be deployed anywhere.

### Vercel / Netlify (recommended)

1. Push the repo to GitHub
2. Import the repo in Vercel or Netlify
3. Set the build command: `npm run build`
4. Set the output directory: `dist`
5. Add environment variable: `VITE_PB_URL=https://your-pb-domain.com`

> The site still works without PocketBase — it falls back to the bundled JSON files.

---

## Backend (PocketBase)

PocketBase is a single binary with no external dependencies.

### Applying migrations (e.g. the projects `shape`/`layers`/`caption` fields)

`backend/pb_migrations/` includes `1790254698_updated_projects_visuals.js`, which adds the
`shape`, `layers` and `caption` fields to the `projects` collection (see `docs/backend.md`).
PocketBase applies every migration in `pb_migrations/` automatically on startup and records each
applied file in `pb_data`, so files that already ran are skipped.

`backend/Dockerfile` copies `backend/pb_migrations/` into the image at `/pb/pb_migrations`, next to
the binary. Rebuilding and restarting the `pocketbase` service (`docker compose up --build`) applies
any new migration against the existing `pb_data` volume. This was checked against a copy of the
production database: the 14 earlier migrations were already recorded there, so only
`1790254698_updated_projects_visuals.js` ran, and all 10 projects were untouched.

If you instead run the PocketBase binary directly on a VPS (Option A below) with `backend/` as its
working directory, `pb_migrations/` is already alongside it and is applied automatically the next
time you (re)start the `pocketbase serve` process — no extra step needed there.

Either way, the new fields are optional: `src/lib/projectVisuals.ts` falls back to its built-in
registry (keyed by project slug) or to heuristics from the project's existing tags/subtitle when
`shape`/`layers`/`caption` aren't set, so the frontend keeps working correctly against a
PocketBase instance that hasn't had this migration applied yet.

### Option A — VPS / dedicated server

```bash
# Upload the binary
scp backend/pocketbase.exe user@server:/opt/portfolio/

# Create a systemd service (Linux — use pocketbase binary, not .exe)
# backend/pocketbase serve --http=0.0.0.0:8090 --dir=/opt/portfolio/pb_data
```

Use a reverse proxy (Nginx / Caddy) to expose PocketBase on port 443 with TLS.

**Caddy example:**
```
pb.yourdomain.com {
    reverse_proxy localhost:8090
}
```

### Option B — Railway / Render / Fly.io

These platforms can run PocketBase as a Docker container.

**Dockerfile:**
```dockerfile
FROM alpine:latest
COPY backend/pocketbase /app/pocketbase
RUN chmod +x /app/pocketbase
EXPOSE 8090
CMD ["/app/pocketbase", "serve", "--http=0.0.0.0:8090"]
```

> Note: use the Linux binary (`pocketbase_linux_amd64.zip`) for containers, not the Windows `.exe`.

### Option C — Local only (admin panel on your machine)

Keep PocketBase running locally and deploy only the frontend as static.
This is the simplest option for a portfolio — you edit content from your machine.

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_PB_URL` | `http://127.0.0.1:8090` | Full URL to your PocketBase instance |

Set in `.env` for local dev, in the hosting dashboard for production.

---

## What to gitignore

Make sure these are in `.gitignore`:

```
backend/pb_data/       ← database files (contains your data)
.env                   ← secrets
dist/                  ← build output
node_modules/
```
