# Architecture

## Overview

```
┌───────────────────────────────────────────────────────────┐
│                     Browser (React)                       │
│                                                            │
│   ContentProvider (context)                                │
│   ├── loads from local JSON instantly (no flicker)          │
│   └── re-fetches from PocketBase in background               │
│                                                            │
│   FieldProvider + FieldCanvas (src/field/)                  │
│   └── one fixed three.js canvas, driven by scroll progress    │
│       shared by every section below                           │
│                                                            │
│   Components (each marks itself up as a field "stop")        │
│   ├── Hero  ├── Work/ProjectPanel  ├── About  ├── Experience  │
│   ├── Contact         ├── Nav             ├── ProjectDetail     │
│   └── SiteFooter / CommandPalette                              │
└────────────────────┬───────────────────────────────────────┘
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

See `docs/frontend.md` for how the field drives the page (the stop contract, progress mapping,
shapes, tech cube, smooth scroll, and the reduced-motion/no-WebGL fallback).

## Directory Structure

```
2026-portfolio/
│
├── designs/                  ← Static HTML prototypes (field.html is the built design's reference)
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
│   ├── field/                 ← The particle field: contract, engine, shapes, tech cube
│   │   ├── contract.ts            ← ShapeId union, FieldApi, data-attribute reference
│   │   ├── FieldProvider.tsx, FieldCanvas.tsx, useField.ts
│   │   ├── smoothScroll.ts        ← Lenis + GSAP ScrollTrigger
│   │   ├── engine/                 ← FieldController (DOM driver) + FieldEngine (three.js)
│   │   └── techcube/                ← Per-project isometric tech cube
│   ├── components/           ← UI building blocks
│   ├── context/
│   │   ├── ContentContext.tsx  ← Provider component
│   │   └── content-hooks.ts    ← Context, JSON defaults, useX() hooks
│   ├── data/                 ← JSON content files (fallback + source of truth)
│   │   ├── site.json
│   │   ├── hero.json
│   │   ├── projects.json
│   │   ├── about.json
│   │   ├── contact.json
│   │   └── experience.json
│   ├── lib/
│   │   ├── pb.ts               ← PocketBase singleton client
│   │   ├── api.ts               ← Typed fetchers (one per collection)
│   │   ├── projectVisuals.ts     ← Resolves each project's field shape / tech-cube layers / tint
│   │   └── types.ts               ← Shared TypeScript interfaces
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
          └─► fetchContact() → pb.collection('contact_content')
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
| 3D / particle field | three.js (custom shaders, no R3F/drei) | 0.183 |
| Scroll animation | GSAP + ScrollTrigger | 3.14 |
| Smooth scroll | Lenis | 1.3 |
| Backend | PocketBase | 0.36 |
| Database | SQLite (embedded) | — |
| SDK | pocketbase JS | 0.26 |
