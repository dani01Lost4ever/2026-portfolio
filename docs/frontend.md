# Frontend

## Entry Points

```
index.html
  └── src/main.tsx          ← React root, BrowserRouter
        └── src/App.tsx     ← Routes, Lenis, Loader, ContentProvider
```

## Components

| Component | Section | Data used |
|-----------|---------|-----------|
| `Navbar` | Fixed top bar | `useSite()` |
| `Hero` | Landing hero | `useHero()` |
| `Marquee` | Scrolling ticker | static |
| `Work` | Project grid | `useProjects()` |
| `About` | Bio + skills | `useAbout()` |
| `Contact` | Contact + socials | `useContact()` |
| `Loader` | Entry animation | none |
| `Cursor` | Custom cursor | none |
| `ScrollProgress` | Top progress bar | none |

**Pages:**
- `ProjectDetail` — `/project/:slug` — uses `useProjects()`

---

## ContentContext

`src/context/ContentContext.tsx` is the single source of truth for all CMS data.

### Hooks

```ts
import {
  useContent,    // full bundle
  useSite,       // SiteData
  useHero,       // HeroData
  useProjects,   // Project[]
  useAbout,      // AboutData
  useContact,    // ContactData
} from '../context/ContentContext'
```

### Fallback strategy

```
Component renders with JSON data  ← instant, zero flicker
        ↓ (async, ~100–300ms)
PocketBase responds
        ↓
setContent() called → React re-renders with live data
```

If PocketBase is offline the site keeps running with the JSON defaults.

---

## API Layer

`src/lib/api.ts` exports one async function per collection:

```ts
fetchSite()                      → Promise<SiteData>
fetchHero()                      → Promise<HeroData>
fetchProjects()                  → Promise<Project[]>
fetchProjectBySlug(slug: string) → Promise<Project | null>
fetchAbout()                     → Promise<AboutData>
fetchContact()                   → Promise<ContactData>
fetchAllContent()                → Promise<ContentBundle>
```

All functions catch errors and return the JSON fallback, so they **never throw**.

---

## Routing

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `HomePage` | All sections stacked vertically |
| `/project/:slug` | `ProjectDetail` | Full case study |

---

## Animations

| Library | Used for |
|---------|----------|
| GSAP | Loader SVG draw timeline |
| Framer Motion | Hero text reveal, page transitions, project cards |
| Lenis | Smooth native-feel scroll |
| CSS | Navbar blur, reveal fade-ups, cursor ring |

### Scroll reveal

Elements with class `.reveal` are observed by `IntersectionObserver` in `App.tsx`.
When they enter the viewport, `.is-visible` is added, triggering the CSS animation.

Stagger delays: `.d1` → 0s, `.d2` → 0.1s, `.d3` → 0.2s, `.d4` → 0.3s

### Loader

Plays once per browser session (stored in `sessionStorage`).
Body scroll is locked until the loader completes.

---

## Adding a new section

1. Create `src/components/MySection.tsx`
2. Add your data shape to `src/lib/types.ts`
3. Add a fetcher to `src/lib/api.ts`
4. Add the field to `ContentBundle` in `types.ts`
5. Add the default value in `ContentContext.tsx`
6. Add a collection to the seed script and PocketBase admin
7. Add a hook export to `ContentContext.tsx`
8. Import and render in `App.tsx` inside `<HomePage />`
