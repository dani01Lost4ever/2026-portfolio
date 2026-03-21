# Architecture

## Overview

```
┌─────────────────────────────────────────────────────┐
│                   Browser (React)                   │
│                                                     │
│   ContentProvider (context)                         │
│   ├── loads from local JSON instantly (no flicker)  │
│   └── re-fetches from PocketBase in background      │
│                                                     │
│   Components                                        │
│   ├── Hero  ├── Work  ├── About  ├── Contact        │
│   ├── Navbar            ├── ProjectDetail           │
│   └── Loader / Cursor / ScrollProgress              │
└────────────────────┬────────────────────────────────┘
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

## Directory Structure

```
2026-portfolio/
│
├── backend/                  ← PocketBase binary + data
│   ├── pocketbase.exe
│   ├── pb_data/              ← SQLite DB (git-ignored)
│   ├── pb_migrations/        ← Future Go/JS migrations
│   └── pb_hooks/             ← Server-side JS hooks
│
├── docs/                     ← This documentation
│
├── scripts/
│   └── seed.mjs              ← One-time bootstrap script
│
├── src/
│   ├── assets/               ← Static images / SVGs
│   ├── components/           ← UI building blocks
│   ├── context/
│   │   └── ContentContext.tsx  ← Single source of truth for content
│   ├── data/                 ← JSON content files (fallback + source of truth)
│   │   ├── site.json
│   │   ├── hero.json
│   │   ├── projects.json
│   │   ├── about.json
│   │   └── contact.json
│   ├── lib/
│   │   ├── pb.ts             ← PocketBase singleton client
│   │   ├── api.ts            ← Typed fetchers (one per collection)
│   │   └── types.ts          ← Shared TypeScript interfaces
│   ├── pages/
│   │   └── ProjectDetail.tsx
│   ├── App.tsx
│   ├── App.css
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
| Animation | Framer Motion + GSAP | 12 / 3 |
| Smooth scroll | Lenis | 1.3 |
| Backend | PocketBase | 0.36 |
| Database | SQLite (embedded) | — |
| SDK | pocketbase JS | 0.26 |
