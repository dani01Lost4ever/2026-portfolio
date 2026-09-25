# Deployment

## Coolify (site + PocketBase)

The production setup. `coolify/docker-compose.yaml` runs two services in one stack:

| Service | Role | Exposed as |
|---|---|---|
| `frontend` | nginx serving the built site; proxies `/api/` and `/_/` to PocketBase | host port `8810` (`FRONTEND_PORT`) |
| `pocketbase` | PocketBase 0.36.7, data in the `pb_data` volume, migrations baked into the image | none (internal only) |

The Coolify server runs without its own proxy (**Proxy: None**): Nginx Proxy Manager terminates
TLS for `daniel.busetto.techdani.cc` and forwards it to the Coolify host on port `8810`. nginx in
`frontend` reaches `pocketbase:8090` over the stack's internal network. The site, the API and the
admin UI share one domain, so there is no CORS to configure.

### First deploy

1. **New resource** → your server → **Docker Compose** → this GitHub repository and branch.
2. Set **Base Directory** to `/coolify` and leave **Docker Compose Location** at its default,
   `/docker-compose.yaml`. Build contexts in that file are relative to `coolify/`.
3. Leave `pocketbase` without a domain. Leave `PB_URL` empty (same origin). Change
   `FRONTEND_PORT` only if `8810` is taken on the host. Deploy.
4. In Nginx Proxy Manager, add a proxy host for the domain pointing at the Coolify host, port
   `8810`, with SSL.
5. Open a terminal on the `pocketbase` container in Coolify and create a temporary admin:
   ```bash
   ./pocketbase superuser upsert you@example.com 'a-long-temporary-password' --dir=/pb/pb_data
   ```

### Restore the production data

6. Sign in at `https://<coolify-temporary-domain-or-final-domain>/_/` with that temporary admin.
7. **Settings → Backups → Upload backup**, choose the `pb_data` backup zip, then **Restore**.
   PocketBase replaces its data and restarts itself; on start it applies any migration not yet
   recorded in the restored database (currently `1790254698_updated_projects_visuals.js`).
8. Sign in again with the **production** admin account: the restore brings back the original
   superusers, and the temporary one is gone.
9. **Settings → Application → Trusted proxy**: add the header `X-Real-IP` so PocketBase logs and
   rate-limits by the visitor's IP (nginx sets it from Coolify's `X-Forwarded-For`, trusting only
   private networks).

This procedure was rehearsed locally with the real backup: 10 projects restored, the new migration
applied on restart, all content served through `/api/`, the admin UI through `/_/`, and a contact
form message saved.

### Switch the domain

10. The DNS record for `daniel.busetto.techdani.cc` already points at Nginx Proxy Manager. Switch
    its proxy host from the old stack to the Coolify host, port `8810` (step 4 above, if you used a
    temporary domain first).
11. The old API domain (`daniel.api.techdani.cc`) is no longer used by the site. Keep the old
    stack running until the new one is verified, then retire it.

### Afterwards

- Every push to the branch can redeploy automatically (enable the webhook in Coolify).
- New migrations in `backend/pb_migrations/` apply on the next PocketBase start.
- Configure scheduled backups in PocketBase (**Settings → Backups**), ideally to S3-compatible
  storage, since the `pb_data` volume lives on the Coolify server.

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

| Variable | Where | Default | Description |
|----------|-------|---------|-------------|
| `PB_URL` | `frontend` container (runtime) | empty | PocketBase URL written to `env-config.js`. Empty = same origin through the nginx proxy |
| `VITE_PB_URL` | build arg / `.env` | empty | Build-time PocketBase URL, used when `PB_URL` is empty |

With both empty, dev uses `http://127.0.0.1:8090` and production builds use the same origin.

---

## What to gitignore

Make sure these are in `.gitignore`:

```
backend/pb_data/       ← database files (contains your data)
.env                   ← secrets
dist/                  ← build output
node_modules/
```
