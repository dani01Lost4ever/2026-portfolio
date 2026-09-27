# Portfolio

Personal developer portfolio built with React and TypeScript. The home page is "One Take": a single
scroll-scrubbed film drawn with plain DOM, SVG and SVG filters. PocketBase is the headless CMS.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Home page film | Plain DOM + SVG + SVG filters (`feDisplacementMap` liquid glass), one small WebGL shader for the glass title, hand-written closed-form springs, no animation, 3D or scroll libraries |
| Command palette | cmdk |
| Backend / CMS | PocketBase |
| Routing | React Router v7 |
| Styling | CSS |
| Containerization | Docker, Nginx |

## Project Structure

```
portfolio/
├── designs/               # Static HTML prototypes (take.html is the reference for the built design)
├── src/
│   ├── take/              # The One Take home page
│   │   ├── engine/            # The film engine: clock, timeline, scenes, layout, liquid glass
│   │   ├── TakeFilm.tsx       # Mounts the engine, opens the sheets, mirrors the chapter in the URL hash
│   │   ├── ProjectSheet.tsx, ContactSheet.tsx   # Sheets that grow out of a tile or button
│   │   ├── TakeDocument.tsx   # The same content as a plain document (hidden, or the reduced-motion page)
│   │   └── posters.ts, Poster.tsx               # SVG poster per project shape
│   ├── components/        # Shared UI (PageHeader, SiteFooter, CommandPalette, ContactForm, SectionLink)
│   ├── pages/             # Route-level pages (Home, ProjectDetail, NotFound)
│   ├── data/              # Static JSON seed data
│   ├── lib/
│   │   ├── pb.ts              # PocketBase client (runtime + build-time URL resolution)
│   │   └── projectVisuals.ts  # Resolves each project's poster shape / architecture layers / caption
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

## How the film works

The home page is one continuous take with no cuts, built by `src/take/engine/`. React mounts the
engine (`Take`) into an empty element and never touches its DOM.

- **Scroll is the clock.** Time is measured in beats (the film is cut at 120 BPM, so one beat is
  0.5 s). One beat is `BEAT_PX` of scroll (15% of the viewport height, clamped to 100–170 px). Wheel
  input moves a goal and the film glides to it; the engine writes its position back to
  `window.scrollY` and follows native scroll (touch, scrollbar) too.
- **Everything is a function of t.** `seek(t)` in `scenes.ts` sets every transform, size and
  opacity from the beat alone, with closed-form springs (`math.ts`), so scrubbing backwards and
  forwards always gives the same frame. The take is 71.5 beats long (`T_END`), and frame `T_END` is
  frame 0, so it loops without a seam.
- **Rest frames and snap.** `RESTS` in `timeline.ts` lists the finished, readable frames. When
  input stops between two of them the film plays on to the next one, or rewinds to the previous
  one if it had barely left it. Arrow keys and Page Up/Down jump rest to rest, Space plays the whole
  take, Home/End go to the start and to Contact.
- **Chapters and hashes.** `CHAPTERS` names seven beats: `top`, `work`, `case`, `now`,
  `experience`, `about`, `contact`. The chapter on screen is mirrored in the URL hash
  (`/#contact`), a reload or link with a hash starts the film there, and the command palette and
  section links glide the film to a chapter.
- **Sheets.** Opening a project tile, the "All projects" / "Projects" buttons, or the contact
  card's "Write to me" grows a sheet out of that element (`ProjectSheet`, `ContactSheet`). The film
  pauses and page scroll locks until the sheet folds back.
- **Reduced motion.** Under `prefers-reduced-motion: reduce` there is no film: the home page is a
  plain reading page (`TakeDocument` with links) under the regular header and footer.
- **Accessibility.** The moving layers are decorative and `aria-hidden`. Under the film the same
  content is rendered as a visually hidden semantic document (`TakeDocument`), so screen readers
  and search engines get the words the film draws. The film's controls stay reachable: the chapter
  buttons, Play, Projects, the project tiles while the grid is at rest, the case study link and
  the contact card. Sheets are modal dialogs that trap Tab and close on Escape.

See `docs/frontend.md` for the modules, and `designs/take.html` for the prototype the
implementation follows.

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

The frontend resolves the PocketBase URL from the first non-empty value of:

1. **Runtime** — `window._env_.PB_URL`, written by `entrypoint.sh` at container startup from the `PB_URL` environment variable
2. **Build-time** — the `VITE_PB_URL` build arg / `.env` variable
3. **Fallback** — `http://127.0.0.1:8090` in dev; the same origin in production builds

In the Docker images, nginx proxies `/api/` and `/_/` (admin UI) to the `pocketbase` service, so leaving `PB_URL` empty serves the site and PocketBase from one domain. Set it only when PocketBase lives on a separate host:

```yaml
frontend:
  environment:
    PB_URL: "https://your-pocketbase-host.example.com"
```

## Deploying on Coolify

See [docs/deployment.md](docs/deployment.md#coolify-site--pocketbase): one Docker Compose resource from `coolify/docker-compose.yaml` (Base Directory `/coolify`), with the `frontend` service on host port 8810 behind Nginx Proxy Manager.

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
