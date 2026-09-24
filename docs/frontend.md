# Frontend

## Entry points

```
index.html
  └── src/main.tsx          ← React root, BrowserRouter
        └── src/App.tsx     ← ContentProvider, FieldProvider + FieldCanvas, routes
```

`App.tsx` wraps everything in `<ContentProvider>` (CMS content) and `<FieldProvider>` (the particle
field), renders `<FieldCanvas>` once as a fixed full-page layer, then the route shell: a skip link,
`Nav`, the command palette, and the routed page.

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `Home` | Hero, Work, About, Experience, Contact stacked as field stops |
| `/project/:slug` | `ProjectDetail` | Full case study |
| `*` | `NotFound` | 404 |

## Components

| Component | Section | Notes |
|-----------|---------|-------|
| `Nav` | Fixed top bar | Section links via `SectionLink` |
| `Hero` | Landing hero | `data-field-stop="grid"` |
| `Work` / `ProjectPanel` | Project list | One field stop per project (`project:<slug>`), renders a `TechCube` |
| `About` | Bio + skills | `data-field-stop="clusters"`, one cluster per skill category |
| `Experience` | Work + education timeline | `data-field-stop="helix"`, one ring per role/school |
| `Contact` / `ContactForm` | Contact + socials | `data-field-stop="at"` |
| `CommandPalette` | ⌘K / Ctrl+K palette | Section + project jump list |
| `SiteFooter` | Footer | static |

`fieldStops.ts`, `projectMeta.ts`, `useOrderedProjects.ts` and `useSectionJump.ts` are small
component-layer helpers, not sections themselves — see below.

---

## ContentContext

`src/context/ContentContext.tsx` + `content-hooks.ts` are the single source of truth for CMS data.

```ts
import {
  useContent,     // full bundle
  useSite,        // SiteData
  useHero,        // HeroData
  useProjects,    // Project[]
  useAbout,       // AboutData
  useContact,     // ContactData
  useExperience,  // ExperienceData
} from '../context/content-hooks'
```

### Fallback strategy

```
Component renders with JSON data  ← instant, zero flicker
        ↓ (async, ~100–300ms)
PocketBase responds
        ↓
setContent() called → React re-renders with live data
```

If PocketBase is offline the site keeps running with the JSON defaults. See `docs/content.md` and
`docs/backend.md` for the project fields (`shape`, `layers`, `caption`) that feed the field below.

---

## The particle field

The site is built around a single scroll-driven three.js point cloud, mounted once and shared by
every section. The implementation lives in `src/field/` and is a typed port of the prototype in
`designs/field.html` (the "Field" design — see `designs/` for the other proposals that were not
built).

```
src/field/
├── contract.ts        ← the seam: ShapeId union, FieldApi, data-attribute docs
├── FieldContext.ts     ← React context (FieldApi | null)
├── FieldProvider.tsx    ← mounts FieldController for the app's lifetime
├── FieldCanvas.tsx      ← the fixed <canvas> host, rendered once
├── useField.ts          ← useField(): FieldApi | null
├── smoothScroll.ts       ← Lenis + GSAP ScrollTrigger, anchor-link handling
├── engine/
│   ├── FieldController.ts ← DOM ⇄ engine driver (stops, scroll → progress, hover)
│   ├── FieldEngine.ts      ← the WebGL/three.js side (renderer, shaders, morphing)
│   ├── stops.ts            ← DOM discovery + measurement of stops
│   ├── shapes/             ← one point-cloud generator per ShapeId
│   ├── shaders.ts, colors.ts, input.ts, math.ts
└── techcube/            ← the per-project isometric tech cube (vanilla, no three.js)
```

### The stop contract

The page never talks to three.js directly. A section marks itself up as a **stop** with data
attributes (full reference in `src/field/contract.ts`); `FieldController` reads them from the DOM,
in document order, and keeps them current via a `MutationObserver` (route changes, CMS content
swapping in) and a `ResizeObserver` (layout shifts):

```html
<section
  data-field-stop="project:bugpilot"   <!-- unique key -->
  data-shape="bug"                     <!-- a ShapeId -->
  data-side="right"                    <!-- where the cloud sits (opposite the text) -->
  data-tint="#dc2626,#7c3aed"          <!-- optional: point colour top,bottom -->
  data-cluster-sizes="5,4,3,5"         <!-- optional: 'clusters' stop only -->
  data-rings="6"                       <!-- optional: 'helix' stop only -->
  data-bg="#0E4148,#031A1F"            <!-- optional: page gradient top,bottom for this stop -->
>
```

`stopAttrs()` in `src/components/fieldStops.ts` builds these attribute objects from typed options
so components don't hand-write data attributes.

Hover/focus coupling uses a parallel set of attributes, matched against `[data-field-hover]`,
`[data-field-cluster]` and `[data-field-ring]`:

```html
<h3 data-field-hover="project:bugpilot">…</h3>       <!-- pulses that stop's shape -->
<div data-field-cluster="1">…</div>                   <!-- lights cluster 1 of the current clusters stop -->
<div data-field-ring="2">…</div>                       <!-- lights ring 2 of the current helix stop -->
```

Elements matching `FIELD_NO_DRAG` (text, links, controls, the tech cube, `nav`) never start a field
drag-rotate or shockwave, so the cloud stays a background effect over content.

### Progress mapping

`stops.ts` gives every stop an anchor range `[anchor, end]` in scroll pixels (`measureStops`).
While the (smoothed) scroll position sits inside a stop's range, progress is exactly that stop's
integer index; between one stop's `end` and the next stop's `anchor` it travels linearly to the
next integer (`locate()`). `FieldController` re-measures scroll into that continuous progress `p`
every frame, notifies subscribers (`FieldApi.onProgress`), and hands the engine the current pair of
stops plus how far between them it is, so `FieldEngine` can morph the point cloud, blend the tint,
crossfade the background gradient, and drive the helix "current ring" / clusters "current group"
effects.

`FieldController` also GSAP-scrubs raw scroll into that eased position (a 0.7s `power3.out`
catch-up on every scroll delta), which is what gives the shape its slight lag/settle instead of
snapping to the scrollbar.

### Adding a new project shape

1. Write a generator in `src/field/engine/shapes/` (`projects.ts` for project shapes, `classic.ts`
   for the hero/clusters/helix/"@" shapes) — a function `(N: number) => Float32Array` that fills a
   fixed-length, Hilbert-ordered buffer of N points (see the existing generators, e.g. `genCoins`,
   `genBrowser`, for the point-budget/`build()` pattern).
2. Add the id to the `ShapeId` union in `src/field/contract.ts`.
3. Register it in `SHAPES` in `src/field/engine/shapes/index.ts` (layout kind, spin/wobble/tilt,
   drag weight, scroll-lock, pointer-push, default page gradient, and the generator).
4. Add the same string to the migration's `select` values
   (`backend/pb_migrations/1790254698_updated_projects_visuals.js`, field `shape`) so it can be
   chosen from the PocketBase admin UI.
5. Add an entry to the `SHAPE_IDS` list and the `REGISTRY` in `src/lib/projectVisuals.ts` — the
   default tech-cube layers, caption and tint for that shape when the CMS record leaves them blank
   (see `docs/backend.md` for the full resolution order: CMS value → registry → generic fallback).
6. Give the stop `data-shape="yourNewId"` (via `stopAttrs()` in the component, usually
   `ProjectPanel.tsx`, which already reads it off `visualsFor(project)`).

### The tech cube

`src/field/techcube/techcube.ts` is a small, dependency-free (no three.js) DOM/CSS-transform
component: an isometric cube of 4 glass slabs that turn 90° in sequence, top first, to bring each
project's 4 architecture layers (`CubeLayer[]`, from `visualsFor()`) onto the front face as the
page scrolls past it. `TechCube.tsx` is the React wrapper: it computes a local progress for its own
slot from the container's viewport position (mirroring the whole-page formula from
`designs/field.html`) when there's no field (`useField()` returns null, e.g. static fallback), or
drives itself off `FieldApi.onProgress` otherwise, and pulses the field's shape (`field.pulse(key)`)
on hover, drag and settled turns.

### Smooth scrolling and anchors

`smoothScroll.ts` wraps Lenis, synced to GSAP's `ScrollTrigger` (`ScrollTrigger.update()` on every
Lenis tick). It also captures every in-page anchor click (`href="#id"`, and `href="/#id"` while
already on `/`) in the capture phase — before React Router's `<Link>` sees it — and eases the
scroll to the target with the fixed nav's height (`data-field-nav`, `.nav`, or `body > nav`) as an
offset, then moves focus to the target and updates the URL hash. `FieldApi.scrollTo()` exposes the
same behaviour to components (e.g. `SectionLink`, the command palette).

### Reduced motion / no-WebGL fallback

`FieldController.isStatic` is true when `prefers-reduced-motion: reduce` is set, or a `webgl2`
context can't be created, or the GL context is later lost. In that mode:

- No `FieldEngine` is created (or it's torn down if the context was lost); `<html>` gets a `static`
  class instead.
- Lenis is skipped — all scrolling, including anchor jumps, is instant/native.
- `TechCube` runs with `reducedMotion` forced on: no idle sway, no spring-back, turns snap.
- `FieldCanvas` still renders its host div (for layout), just with no canvas inside.

Components should treat `useField()` returning `isStatic: true` (or `null`, outside the provider)
as "no field" and degrade gracefully rather than assuming a running canvas.

---

## API layer

`src/lib/api.ts` exports one async function per collection:

```ts
fetchSite()                      → Promise<SiteData>
fetchHero()                      → Promise<HeroData>
fetchProjects()                  → Promise<Project[]>
fetchProjectBySlug(slug: string) → Promise<Project | null>
fetchAbout()                     → Promise<AboutData>
fetchContact()                   → Promise<ContactData>
fetchExperience()                → Promise<ExperienceData>
fetchAllContent()                → Promise<ContentBundle>
```

All functions catch errors and return the JSON fallback, so they **never throw**.

`src/lib/projectVisuals.ts` resolves each project's field shape, tech-cube layers, caption and
point tint (`visualsFor(project)`) — see `docs/backend.md` for the resolution order.

---

## Design rules

From the header comment in `src/index.css` and the `designs/field.html` prototype:

- Display type is Fraunces (upright only), body text is Manrope.
- Corner radii never exceed 4px.
- No italics.
- No monospace.
- No pill-shaped buttons/badges.
- No numbered section labels (no "01 / 02" style headers).
- No tag chips (tech tags render as plain `·`-separated text, e.g. in `Experience`'s `.tech` line).

## Adding a new section

1. Create `src/components/MySection.tsx`.
2. Add your data shape to `src/lib/types.ts` and a fetcher to `src/lib/api.ts`.
3. Add the field to `ContentBundle` and its default in `content-hooks.ts`.
4. Add a collection to the seed script and PocketBase admin.
5. Add a hook export to `content-hooks.ts`.
6. If the section should be a field stop, mark it up with `stopAttrs()` (see "The stop contract"
   above) and pick or add a `ShapeId`.
7. Import and render it in `src/pages/Home.tsx`.
