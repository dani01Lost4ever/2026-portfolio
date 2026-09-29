# Frontend

## Entry points

```
index.html
  └── src/main.tsx          ← React root, BrowserRouter
        └── src/App.tsx     ← ContentProvider, TakeProvider, PosterDefs, routes
```

`App.tsx` wraps everything in `<ContentProvider>` (CMS content) and `<TakeProvider>` (makes the
film's API reachable from outside the home page), renders `<PosterDefs>` once (the SVG symbols
every poster uses), then the route shell: a skip link, a scroll manager, the command palette and
the routed page. The scroll manager scrolls to the top on route change and lands a URL hash on its
section, except on `/` while the film runs (the film reads its own hash).

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `Home` | The One Take film (`TakeFilm`); with reduced motion, a reading page (`TakeDocument`) |
| `/project/:slug` | `ProjectDetail` | Full case study: poster, overview/challenge/solution, results, architecture layers, previous/next |
| `/prototypes` | `Prototypes` | The prototype gallery: a card per entry of `src/data/prototypes.json` |
| `/prototypes/:slug` | `PrototypeViewer` | One prototype running live in a frame at desktop, tablet or phone width; previous/next |
| `*` | `NotFound` | 404 |

## Modules

### `src/take/` (React side)

| File | Notes |
|------|-------|
| `TakeFilm.tsx` | Mounts the `Take` engine into an empty `<div>`, opens the sheets, pauses the film and locks page scroll while one is open, mirrors the chapter in the URL hash |
| `ProjectSheet.tsx` | Project sheet: grows out of a tile or button, arrows move through every project, folds back into the project's tile |
| `ContactSheet.tsx` | Contact sheet: grows out of the contact card's "Write to me", holds the email and `ContactForm` |
| `useSheetMotion.ts` | Open/close springs on real time for both sheets, `sheetRect()`, `trapTab()` |
| `TakeDocument.tsx` | The film's content as a semantic document: visually hidden under the film, the visible page under reduced motion |
| `TakeContext.ts` / `TakeProvider.tsx` | `ChapterId`, `isChapterId()`, `useTake()` (the film's `goToChapter`, or null when no film runs) |
| `posters.ts` / `Poster.tsx` | One SVG `<symbol>` per `ShapeId` plus shared filters and the lock-screen wallpaper; `PosterDefs` renders them once, `Poster` draws one |
| `useReducedMotion.ts` | `prefers-reduced-motion` as a React value |
| `take.css` | Styles for the film, the sheets and the reading page; no transitions or animations under `.take` |

### `src/take/engine/` (no React)

| File | Notes |
|------|-------|
| `Take.ts` | The engine class: wheel/scroll/touch/keyboard input, smooth wheel, play with rest holds, loop, public API |
| `timeline.ts` | `T_END` (71.5 beats), `RESTS`, `restHolds`, `CHAPTERS`, `BENTO_OPEN`, `CASE_BEAT` |
| `scenes.ts` | `seek(k, t)`: every style of the film as a function of the beat |
| `build.ts` | Creates the film's DOM once from the content; marks decorative layers `aria-hidden` |
| `layout.ts` | Every viewport-dependent size and position, computed on mount and on resize |
| `content.ts` | `takeContent(bundle)`: the CMS `ContentBundle` mapped to what the film shows |
| `glass.ts` | Liquid glass: a cloned backdrop run through `feDisplacementMap`, with distance-field maps (analytic rounded-rect SDF, exact EDT for glyphs) |
| `glassWordGL.ts` | The case study's glass title on one WebGL canvas: the letters' signed distance fields in one atlas, the poster rasterised once (fonts inlined) as the backdrop, the melt into the droplet as a smooth union. Used when WebGL is available and the title has at most 12 letters; the SVG glass letters are the fallback |
| `iris.ts` | Six-blade iris aperture (SVG paths), also the shutter of a chapter cut |
| `navGlass.ts` | The chapter nav's glass: `NavLens` (the spring-driven lens on the chapter) and `setRim` (rim light for a glass capsule) |
| `math.ts` | `clamp`/`lerp`/easing, closed-form spring step response, `spr`, `track`, `SPB` |
| `dom.ts` | The small set of per-frame DOM writes (boxes, masked text lines) |
| `icons.ts` | Inline SVG glyphs used inside the glass and black shapes |

### `src/components/`

| Component | Notes |
|-----------|-------|
| `PageHeader` | Sticky header on every page except the film: brand to `/`, the CMS nav (section links for `/#chapter`, router links for pages like `/prototypes`, `aria-current` on the page you're on) |
| `SiteFooter` | Copyright and "Back to top" |
| `CommandPalette` | ⌘K / Ctrl+K dialog (cmdk): projects, film chapters, prototypes, email and socials |
| `SectionLink` | A link to a home-page section that works from any route (uses `useSectionJump`) |
| `useSectionJump` | `jump(id)`: glides the film to a chapter, scrolls the reading page, or navigates to `/#id` |
| `ContactForm` | The short-note form, posts to PocketBase `messages` |
| `PrototypeFrame` | `BrowserBar` (a browser window's bar with the address) and `PrototypeShot` (a prototype's screenshot, or its poster) |

`content.ts` (CMS placeholder guards), `projectMeta.ts` and `Icons.tsx` are small helpers.

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
  useNow,         // NowData (always from src/data/now.json)
  usePrototypes,  // PrototypesData (always from src/data/prototypes.json)
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
`docs/backend.md` for the project fields (`shape`, `layers`, `caption`) used by the film and
the project page.

---

## The film

The home page is one take with no cuts, a typed port of `designs/take.html`. `Take` owns its DOM:
React only gives it an empty element, and `TakeFilm` rebuilds the engine when the content changes,
keeping the current beat.

### Scroll as the clock

Time is in **beats**. The film is cut at 120 BPM (`SPB = 0.5` seconds per beat) and one beat is
`BEAT_PX` of page scroll (`layout.ts`: 15% of the viewport height, clamped to 100–170 px).

- **Wheel**: the engine cancels the native wheel, moves a goal and eases towards it
  (`WHEEL_TAU`, 0.2 s), then writes its position back to `window.scrollY`.
- **Native scroll** (touch, scrollbar): the engine reads `window.scrollY` and follows it with a
  short catch-up.
- **Keyboard**: arrows and Page Up/Down jump to the next or previous rest frame, Space plays the
  whole take at film speed, Home goes to the start and End to Contact. Keys are ignored in form
  fields and inside dialogs.
- **Chrome**: chapter buttons, the timeline bar (click to seek), Play, the brand (back to 0), and
  a Prototypes link to the gallery (shown when `prototypes.json` has entries).

`scenes.ts` keeps no state between frames: `seek(k, t)` runs every scene with the current beat and
writes transforms, sizes and opacities. Motion comes from closed-form springs (`stepResp`, `spr`)
that start at a given beat, and `track()` sums one spring per change so a value with many targets
stays a function of t. Scrubbing backwards gives the same frames as playing forwards. The engine
only calls `seek` when t changes, plus a few ambient stretches (the wall's moving shadows, the
clock's minute).

Beat map (from the header of `scenes.ts`): 0–9 open (wordmark → pill → iris), 9–18 work (grid
unfolds into a bento), 18–32 case study (glass title, toolbar, slider, orb), 32–38 now (lock
screen), 38–54 stage (phone, Dynamic Island → window with Experience and About), 54–62 order (one
black shape), 62–71.5 wall (contact card, back to the wordmark). Frame `T_END` equals frame 0, so
the take loops.

### Scroll, rest frames and playback

Scrolling is free: the film stays on whatever frame the scroll leaves it, between rests included.
Wheel input moves a goal and the film catches up with it, in `WHEEL_TAU` (0.16 s) for a mouse
wheel's notches and `FINE_TAU` (0.06 s) for a trackpad, whose small deltas already carry the
system's inertia (a wheel event under 40 px marks the next 600 ms as trackpad). Native scroll
(touch, the scrollbar) is followed in `FINE_TAU` too. Ctrl + wheel is left to the browser's zoom.

`RESTS` lists the finished, readable frames. The arrow keys and Page Up/Down glide rest to rest.
Space plays the take at film speed and holds on each rest for `restHolds(content)` seconds: 0.9 s
to land plus the words that frame shows at 4 words a second, between 1.2 and 7 s, so the holds
follow the CMS text. `seekFrame(b)` jumps to a single frame and stops (for reviewing frames; in
dev the engine is on `window.oneTake`).

### Chapters and URL hashes

`CHAPTERS` in `timeline.ts` maps each `ChapterId` (`src/take/TakeContext.ts`) to a beat:

| Chapter | Label | Beat |
|---------|-------|------|
| `top` | Intro | 0 |
| `work` | Work | 16.2 |
| `case` | Case | 22.5 |
| `now` | Now | 37.5 |
| `experience` | Experience | 45.4 |
| `about` | About | 53.95 |
| `contact` | Contact | 65.5 |

A chapter is "on" from half a beat before its beat. `TakeFilm` writes the chapter on screen to the
hash with `history.replaceState` (`top` clears it), and on mount starts the film at the chapter
named by the hash, so `/#contact` is shareable and a reload lands there.

### Jumping to a chapter

`goTo(b)` in `Take.ts` (the chapter nav, the timeline, Home/End, the brand, `goToChapter`) picks
between two moves:

- **Play there** when the target is at most `NEAR` (9) beats ahead, counting through the loop, or at
  most `NEAR_BACK` (1.5) beats behind: the film runs to it in `350 + 170 × beats` ms, eased. Work →
  Case, Now → Experience, Experience → About and Contact → Intro (through the wall and back to the
  wordmark) play this way.
- **Cut** for anything further or behind: the film's six-blade iris closes over the frame in
  `CUT_CLOSE` (420 ms, easing in), the playhead and timecode cross the timeline meanwhile, the take
  jumps once the iris is shut, and the iris opens on a critically damped spring (`CUT_OPEN`,
  response 0.55 s). While it closes, wheel, scroll and keys are swallowed; a new jump retargets the
  cut, or closes the iris again from where it is if it was already opening. The HUD turns light over
  the shut iris (`#chrome.shut`).

The nav's lens and its highlighted label move to the target chapter on the click, not on arrival
(`heading` in `Take.ts`).

### The chapter nav

The chapter nav (`#tk-chap`) and the Play button are capsules of glass: `backdrop-filter`
blur and saturation over the film, a translucent tint that turns dark over dark scenes, and the rim
light of the film's glass as a background (`setRim`, from `rrMaps` in `glass.ts`). A lens of thicker
glass (`NavLens` in `navGlass.ts`) marks the chapter: a real-time spring (response 0.42 s, damping
0.78) carries it to the next one, and it stretches with its speed. Under
`prefers-reduced-transparency` the capsules are solid. The page header's nav uses the same capsule
in CSS, with its last item as the lens, and so does the prototype viewer's device switch.

The top bar stays on one row: under 1260 px the brand drops its role, under 1000 px the chapter
nav goes (scroll, the keys and the timeline still move through the film), under 400 px the links
and Play tighten, and under 372 px the Prototypes link goes too (the page header and ⌘K still
reach the gallery).

### The work grid

The first nine projects become tiles; tile 0 is also the wordmark's period, the pill and the iris.
While the bento rests (`BENTO_OPEN`, beats 14.9–17.4) the tiles are focusable buttons: tile 0 plays
the film on to the case study, any other tile opens its project sheet. "All N projects" and the
chrome's "Projects" button open the project sheet on the first project.

### Sheets

`ProjectSheet` and `ContactSheet` are modal dialogs (`role="dialog"`, `aria-modal`) driven by
`useSheetMotion`: the sheet grows on a spring from the rect of the element that opened it to
`sheetRect()` (centred on desktop, nearly full screen under 760 px), and on close folds back into
the project's tile (or the "All projects" button, when the project has no tile or the bento is not
at rest) or the contact button. While a sheet is open the film is paused (`Take.pause(true)`) and
`<html>` has `overflow: hidden`. In the project sheet the left/right arrows (and the bottom bar)
push through every project, looping; the lead project also offers "Watch it in the film", which
closes the sheet and plays to the case. Escape closes, Tab is trapped, and focus starts on the
close button.

---

## Content mapping

The film never reads the bundle directly: `takeContent()` in `src/take/engine/content.ts` builds a
`TakeContent` from the `ContentBundle`, so a PocketBase edit reaches the film. `Home` and
`TakeDocument` use the same object.

| Film | Comes from |
|------|------------|
| Wordmark | `hero.name`, lower-cased, letters only (default `daniel`) |
| Role | `about.heading` up to the first comma or period (default `Full-stack developer`) |
| Tagline | The first two `hero.taglines` lines |
| Location | `hero.location` (default `Venice`) |
| Projects | `projects` sorted by `order`; `shape` and `caption` from `visualsFor()`, first 3 `results` |
| Case study | The first project: title, caption as the headline, first sentence of `description`, first 5 tags, link to `/project/:slug` |
| Now | `now.items`: the "listening" item becomes the music player (`Artist — Title`), up to 3 others become notifications |
| Experience | Every role with a parseable period plus education (high school skipped), sorted by start, last 6 rows; an intro line from the first company and the latest school |
| About | `about.heading`, `about.bio[1]` (or `bio[0]`), the first 4 skill groups |
| Contact card | `contact.email`, `contact.availability`, a GitHub URL from `contact.socials` or the first GitHub project link |

The full name (`Daniel Busetto`) is a constant in `content.ts`, not CMS content. `cmsText()` drops
bracketed placeholders like `[City]`.

---

## Prototype gallery

`/prototypes` (`src/pages/Prototypes.tsx`) lists `src/data/prototypes.json` through
`usePrototypes()`; `listPrototypes()` in `src/lib/prototypes.ts` keeps the entries with a slug and a
title, in the file's order, and fills in missing fields. Each card shows the prototype's
screenshot (`image`, 16:10) in a browser window, or its poster (`shape`, default `browser`) when
it has none or the file fails to load, then its number, year, kind, `status` badge, title,
description and stack. The whole card links to its page (the title link's `::after` covers the
card); "Open it" opens the prototype itself in a new tab.

`/prototypes/:slug` (`src/pages/PrototypeViewer.tsx`) runs the prototype in an `<iframe>` at a
real device width (Desktop 1440×900, Tablet 834×1112, Phone 390×844 CSS px), scaled down with a
transform to fit the stage and the viewport's height, so the prototype's own breakpoints apply.
The screenshot stays under the frame until it loads. With `embed: false`, or no `url`, the page
shows the picture instead of a frame. An unknown slug redirects to `/prototypes`.

Prototypes kept in the repository live in `designs/`: the `portfolio-designs` plugin in
`vite.config.ts` serves that folder at `/designs/` in dev (a missing file is a 404) and copies it
into `dist/designs/` on build; nginx serves it as files with `X-Robots-Tag: noindex`, never
falling back to the app. See `docs/content.md#add-a-prototype`.

## Section jumps and the command palette

`useSectionJump().jump(id)` works from anywhere:

- on `/` with the film running and `id` a `ChapterId`: `useTake().goToChapter(id)` plays the film
  there or cuts to it (see "Jumping to a chapter"), and the hash is updated;
- on `/` without the film (reduced motion): scrolls to the element with that id, updates the hash
  and moves focus to it;
- on any other route: navigates to `/#id`, and the home page lands on it once rendered.

`SectionLink` (used by `PageHeader`) and the command palette's "Chapters" group both go through
it. The palette is marked `data-take-prevent` and `role="dialog"`, so the film ignores wheel and
keys while it is open.

## Reduced motion

`useReducedMotion()` follows `prefers-reduced-motion: reduce` live. When it is set, `Home` renders
no film: `PageHeader`, then `TakeDocument` with `interactive` (project titles link to their pages,
the lead has a "Read the full case study" link, contact has the email, GitHub and `ContactForm`),
then `SiteFooter`. Each section carries its chapter's id, so `/#contact` still lands, through the
scroll manager in `App.tsx`. Section jumps and "Back to top" scroll instantly.

## Accessibility

- The film's moving layers are decorative and `aria-hidden`. What stays reachable is interactive:
  the chrome (chapter buttons with `aria-current`, Projects, Play with `aria-pressed`), the tiles
  while the bento rests, "All projects", the case study link and the contact card.
- `TakeDocument` renders the same content under the film as a visually hidden document with
  headings and lists (no links), so screen readers and search engines get the words the film draws.
- Sheets and the palette are modal dialogs that trap Tab and close on Escape.

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

`src/lib/projectVisuals.ts` resolves each project's poster shape, architecture layers and caption
(`visualsFor(project)`); see `docs/backend.md` for the resolution order.

---

## Design rules

From the header comments in `src/index.css` and `src/take/take.css`, following
`designs/take.html`:

- Light paper page. Display type is Archivo 800 (expanded), text is Geist, small meta is Geist
  Mono, chrome and kickers are Chivo Mono.
- Pills for buttons, big radii on cards.
- No italics.
- No hover motion.
- Inside the film nothing uses CSS transitions or animations: the engine places everything from t.

## Adding a poster shape

1. Add the id to the `ShapeId` union in `src/lib/types.ts` and to `SHAPE_IDS` in
   `src/lib/projectVisuals.ts`.
2. In `src/take/posters.ts`, give it a background in `BG` (and add it to `LIGHT` if dark text reads
   better on it), and add a `p-<id>` symbol to `posterDefsMarkup()`, drawn in a 400×400 box. Keep it
   plain SVG: the film clones posters behind its liquid glass.
3. Optionally add a `REGISTRY` entry in `projectVisuals.ts` for a project slug.
4. To pick it in the PocketBase admin UI, add a new migration that adds the value to the
   `projects.shape` select (see `docs/backend.md`).

## Adding a film section

1. Add the data shape to `src/lib/types.ts`, a fetcher to `src/lib/api.ts`, the field to
   `ContentBundle` and its default and hook in `content-hooks.ts`, and a collection to the seed
   script and PocketBase admin.
2. Map it into `TakeContent` in `src/take/engine/content.ts`.
3. Create its DOM in `build.ts`, its positions in `layout.ts`, and a scene function in `scenes.ts`
   called from `seek()`.
4. Give it beats in `timeline.ts`: move the later scenes and `T_END`, add its rest frames to
   `RESTS`, and a chapter to `CHAPTERS` (plus `ChapterId` / `CHAPTER_IDS` in `TakeContext.ts` and the
   palette's `SECTIONS`) if it should be reachable.
5. Add the same content as a section with the chapter's id to `TakeDocument.tsx`.
