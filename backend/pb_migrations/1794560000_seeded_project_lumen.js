/// <reference path="../pb_data/types.d.ts" />
// Lumen joins the projects as the second one (src/data/projects.json, id "02"): the record is
// created only if no project has the slug `lumen` yet, and the projects from the second on move
// down one place (`order` + 1, and a numeric `display_id` follows). The down migration removes
// it and moves them back.
const SLUG = "lumen"
const AT = 1 // order of the second project

const LUMEN = {
  display_id: "02",
  slug: SLUG,
  year: "2026",
  title: "Lumen",
  subtitle: "A daily light puzzle: bring the light to the sensor with mirrors and lenses",
  description: "A browser puzzle built on a 2D ray tracer: place and turn mirrors, lenses, prisms, filters and even a black hole on a continuous optical bench until enough light reaches the sensor. Five scenes a day, the same for everyone, plus endless, duels, a campaign, community levels and an Android app on Google Play. Next.js 15, React 19, TypeScript, libsql.",
  overview: "Lumen is a daily light puzzle for the browser and for Android. Each scene is an optical bench: a lamp, a sensor, opaque walls, and a tray of pieces you place and turn freely — mirrors, lenses, prisms, dichroics, filters, half mirrors, even a black hole that bends the beam. The sensor has to receive a threshold share of the light to clear a scene. Five scenes a day, the same for everyone, then endless, duels, a campaign in chapters, a level editor with shareable links, hints paid in photons, and optional accounts with Google or Apple sign-in. The Android app is the same pages exported statically into Capacitor.",
  challenge: "Real optics on a continuous bench, not a grid: reflection, thin lenses, curved mirrors, colour channels and a gravitational field all had to trace fast enough to animate at 60 fps while you drag a piece, and the score had to be exact and fair. Every scene is generated from a seed, so the generator has to prove a level has no shorter answer than intended, and no change to it may ever rewrite a daily that people already played. On top of that: a server that recomputes every submitted run from its placements rather than trusting a score, and a phone layout where the bench stands up for a thumb.",
  solution: "The physics lives in src/lib/optics with no React or DOM in it: ray tracing against line segments, one (source, channel) group at a time, with surfaces tested in priority order; the preview traces 40 rays, a locked-in score 512, so points never depend on the animation. The beam is drawn as fillable geometry whose brightness follows ray density. A seeded generator with a visibility-distance proof guarantees no shortcut, and new content enters only from a threshold date forward. Next.js route handlers keep runs, boards and levels in libsql (SQLite in development, Turso in production) and replay each run server-side. Interruptible springs in damping and response carry every motion; the same build is exported statically into a Capacitor Android app.",
  tags: ["Next.js 15", "React 19", "TypeScript", "Ray tracing", "SVG", "libsql · Turso", "Capacitor", "Android"],
  gradient: "linear-gradient(135deg, #0B0B0F 0%, #3B2A12 100%)",
  results: [
    { value: "5", label: "scenes a day, the same for everyone" },
    { value: "512", label: "rays behind every locked-in score" },
    { value: "1.0.19", label: "on Google Play" },
  ],
  role: "Solo Developer",
  timeline: "Personal project",
  link: "https://lumen.techdani.cc/",
  shape: "lumen",
  layers: [
    { label: "Bench", tech: "React 19 · SVG · springs" },
    { label: "Optics", tech: "2D ray tracer, closed-form" },
    { label: "API", tech: "Next.js 15 route handlers" },
    { label: "Data", tech: "libsql · SQLite / Turso" },
  ],
  caption: "Five scenes a day, the same light for everyone.",
}

/** Move every project at `from` or later by `by` places; a numeric display id follows its order. */
function shift(app, from, by, skipId) {
  for (const r of app.findRecordsByFilter("projects", `order >= ${from}`, "", 0, 0)) {
    if (r.id === skipId) continue
    const order = r.getInt("order") + by
    r.set("order", order)
    if (/^\d+$/.test(r.getString("display_id"))) r.set("display_id", String(order + 1).padStart(2, "0"))
    app.save(r)
  }
}

function findLumen(app) {
  const found = app.findRecordsByFilter("projects", `slug = '${SLUG}'`, "", 1, 0)
  return found.length ? found[0] : null
}

migrate((app) => {
  if (findLumen(app)) return // already there (seeded by hand): nothing to do
  shift(app, AT, 1, "")
  const record = new Record(app.findCollectionByNameOrId("projects"))
  for (const [k, v] of Object.entries(LUMEN)) record.set(k, v)
  record.set("order", AT)
  app.save(record)
}, (app) => {
  const record = findLumen(app)
  if (!record) return
  const at = record.getInt("order")
  app.delete(record)
  shift(app, at + 1, -1, "")
})
