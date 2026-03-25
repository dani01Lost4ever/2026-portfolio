# Portfolio

Personal developer portfolio built with React, TypeScript, and Three.js — backed by PocketBase as a headless CMS.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| 3D / Animation | Three.js, React Three Fiber, Framer Motion, GSAP |
| Smooth Scroll | Lenis |
| Backend / CMS | PocketBase |
| Routing | React Router v7 |
| Styling | CSS |
| Containerization | Docker, Nginx |

## Project Structure

```
portfolio/
├── src/
│   ├── components/       # UI components (Navbar, Hero, Work, etc.)
│   ├── pages/            # Route-level pages
│   ├── data/             # Static JSON seed data
│   ├── lib/
│   │   └── pb.ts         # PocketBase client (runtime + build-time URL resolution)
│   └── main.tsx
├── backend/
│   ├── Dockerfile        # PocketBase Docker image
│   ├── pb_data/          # PocketBase database (gitignored)
│   └── pb_migrations/    # PocketBase schema migrations
├── scripts/
│   ├── seed.mjs          # Seed PocketBase from data/ JSON files
│   └── fix-rules.mjs     # Fix PocketBase collection access rules
├── Dockerfile            # Multi-stage build: Node (build) → Nginx (serve)
├── docker-compose.yml    # Runs frontend + pocketbase together
└── entrypoint.sh         # Injects PB_URL at container startup
```

## Local Development

### Prerequisites

- Node.js 20+
- The `backend/pocketbase.exe` binary (Windows) — download from [pocketbase.io](https://pocketbase.io/docs/)

### Setup

```bash
npm install
```

### Run (frontend + backend together)

```bash
npm start
```

This runs PocketBase on `http://127.0.0.1:8090` and the Vite dev server concurrently.

### Run separately

```bash
# Backend only
npm run pb

# Frontend only
npm run dev
```

### Seed the database

After starting PocketBase for the first time, seed it with the content from `src/data/`:

```bash
npm run seed
```

If collection access rules need resetting:

```bash
npm run fix-rules
```

### Create a PocketBase admin

```bash
npm run pb:admin
```

## Docker

### Start

```bash
npm run docker:up
# or
docker compose up --build
```

This starts two services:
- `pocketbase` — PocketBase API on port `8099`
- `frontend` — Nginx serving the built React app on port `809`

### Stop

```bash
npm run docker:down
```

### Logs

```bash
npm run docker:logs
```

### Build & Push

```bash
npm run docker:publish
```

## Environment Variables

The frontend resolves the PocketBase URL in this priority order:

1. **Runtime** — `window._env_.PB_URL` injected by `entrypoint.sh` at container startup (set via `docker-compose.yml` `environment:`)
2. **Build-time** — `VITE_PB_URL` build arg / `.env` variable
3. **Fallback** — `http://127.0.0.1:8090`

To point a deployed container at an external PocketBase instance without rebuilding:

```yaml
# docker-compose.yml
frontend:
  environment:
    PB_URL: "https://your-pocketbase-host.example.com"
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm start` | Start PocketBase + Vite together |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run seed` | Seed PocketBase collections from JSON |
| `npm run fix-rules` | Reset PocketBase collection access rules |
| `npm run pb:admin` | Create a PocketBase superuser |
| `npm run docker:up` | Build and start Docker services |
| `npm run docker:down` | Stop Docker services |
| `npm run docker:logs` | Tail Docker service logs |
| `npm run docker:publish` | Build and push Docker images |
