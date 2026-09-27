# Architecture

## Overview

```
┌───────────────────────────────────────────────────────────┐
│                     Browser (React)                       │
│                                                           │
│   ContentProvider (context)                               │
│   ├── loads from local JSON instantly (no flicker)        │
│   └── re-fetches from PocketBase in background            │
│                                                           │
│   TakeProvider (src/take/)                                │
│   └── exposes the film's goToChapter() to the palette     │
│       and section links while the home page is mounted    │
│                                                           │
│   Routes                                                  │
│   ├── /               Home                                │
│   │   ├── TakeFilm → Take engine (own DOM, scroll clock)  │
│   │   │   ├── ProjectSheet / ContactSheet                 │
│   │   │   └── TakeDocument (visually hidden copy)         │
│   │   └── reduced motion: PageHeader + TakeDocument       │
│   │                       + SiteFooter                    │
│   ├── /project/:slug  ProjectDetail                       │
│   └── *               NotFound                            │
│   CommandPalette, PosterDefs (SVG symbols, once)          │
└────────────────────┬──────────────────────────────────────┘
                     │  PocketBase JS SDK (REST)
┌────────────────────▼────────────────────────────────┐
│              PocketBase  :8090                      │
│                                                     │
│   /api/collections/…/records  (read)                │
│   /_/  (admin UI — content editing)                 │
│                                                     │
│   SQLite  →  backend/pb_data/data.db                │
└─────────────────────────────────────────────────────┘
```

See `docs/frontend.md` for how the film works (the scroll clock, beats, rest frames, chapters,
sheets, content mapping and the reduced-motion reading page).

## Directory Structure

```
2026-portfolio/
│
├── designs/                  ← Static HTML prototypes (take.html is the built design's reference)
│
├── backend/                  ← PocketBase binary + data
│   ├── pocketbase.exe
│   ├── pb_data/              ← SQLite DB (git-ignored)
│   └── pb_migrations/        ← JS migrations, applied on PocketBase start
│
├── docs/                     ← This documentation
│
├── scripts/
│   └── seed.mjs              ← One-time bootstrap script
│
├── src/
│   ├── take/                 ← The One Take home page
│   │   ├── engine/               ← The film engine (no React)
│   │   │   ├── Take.ts               ← Class: input, smooth wheel, snap to rest frames, keys, loop, API
│   │   │   ├── timeline.ts           ← T_END, RESTS, CHAPTERS
│   │   │   ├── scenes.ts             ← seek(t): every style as a function of the beat
│   │   │   ├── build.ts              ← Creates the film's DOM once
│   │   │   ├── layout.ts             ← Viewport-dependent sizes and positions
│   │   │   ├── content.ts            ← ContentBundle → what the film shows
│   │   │   ├── glass.ts              ← Liquid glass (cloned backdrop + feDisplacementMap)
│   │   │   ├── glassWordGL.ts        ← The glass title on WebGL (SDF atlas, smooth-union melt)
│   │   │   ├── iris.ts, math.ts, dom.ts, icons.ts
│   │   ├── TakeFilm.tsx          ← Mounts the engine, sheets, URL hash per chapter
│   │   ├── ProjectSheet.tsx, ContactSheet.tsx, useSheetMotion.ts
│   │   ├── TakeDocument.tsx      ← Semantic copy of the film / reduced-motion page
│   │   ├── TakeContext.ts, TakeProvider.tsx   ← ChapterId, useTake()
│   │   ├── posters.ts, Poster.tsx             ← SVG poster symbols per ShapeId
│   │   ├── useReducedMotion.ts
│   │   └── take.css
│   ├── components/           ← Shared UI (PageHeader, SiteFooter, CommandPalette, ContactForm, …)
│   ├── context/
│   │   ├── ContentContext.tsx  ← Provider component
│   │   └── content-hooks.ts    ← Context, JSON defaults, useX() hooks
│   ├── data/                 ← JSON content files (fallback + source of truth)
│   │   ├── site.json
│   │   ├── hero.json
│   │   ├── projects.json
│   │   ├── about.json
│   │   ├── contact.json
│   │   ├── experience.json
│   │   └── now.json            ← "Now" items; JSON only, no PocketBase collection
│   ├── lib/
│   │   ├── pb.ts               ← PocketBase singleton client
│   │   ├── api.ts               ← Typed fetchers (one per collection)
│   │   ├── projectVisuals.ts     ← Resolves each project's poster shape / architecture layers / caption
│   │   └── types.ts               ← Shared TypeScript interfaces (incl. ShapeId, CubeLayer)
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── ProjectDetail.tsx
│   │   └── NotFound.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── .env                      ← VITE_PB_URL (local)
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Data Flow

```
App boot
  │
  ├─1─► ContentProvider mounts
  │       └─► useState(defaultContent)  ← JSON files, renders instantly
  │
  └─2─► useEffect fires fetchAllContent()
          │
          ├─► fetchSite()    → pb.collection('site_settings')
          ├─► fetchHero()    → pb.collection('hero_content')
          ├─► fetchProjects()→ pb.collection('projects')
          ├─► fetchAbout()   → pb.collection('about_content')
          ├─► fetchContact() → pb.collection('contact_content')
          ├─► fetchExperience() → pb.collection('work_experience'), pb.collection('education')
          └─► now            → src/data/now.json (always; no collection)
                │
                ├─ success → setContent(liveData)  ← components re-render
                └─ failure → keep JSON defaults (silent fallback)
```

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend framework | React | 19 |
| Language | TypeScript | 5.9 |
| Build tool | Vite | 8 |
| Routing | React Router | 7 |
| Home page film | Plain DOM + SVG filters, hand-written springs (no library) | — |
| Command palette | cmdk | 1.1 |
| Head tags | react-helmet-async | 3 |
| Backend | PocketBase | 0.36 |
| Database | SQLite (embedded) | — |
| SDK | pocketbase JS | 0.26 |
