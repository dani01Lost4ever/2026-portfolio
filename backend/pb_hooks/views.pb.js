/// <reference path="../pb_data/types.d.ts" />

/**
 * POST /api/projects/{slug}/view — public project view counter.
 *
 * The `projects` collection keeps `updateRule = null` (superusers only), so
 * anonymous visitors can't PATCH records. This route increments `views`
 * server-side instead, so the only thing a visitor can change is +1 on the
 * counter of an existing project.
 *
 * - The increment is a single SQL UPDATE (atomic, no read-modify-write race)
 *   and deliberately bypasses record hooks/realtime events.
 * - Light rate limiting: each IP counts at most once per slug per
 *   VIEW_WINDOW_MS. Requests inside the window still return 200 with the
 *   current total (`counted: false`), so the page can always show the number.
 *
 * Responses: 200 { views, counted } · 404 unknown slug.
 *
 * NOTE: route handlers are executed in their own isolated context, so
 * constants must be declared inside the handler, not at module scope.
 */
routerAdd("POST", "/api/projects/{slug}/view", (e) => {
  const VIEW_WINDOW_MS = 60 * 1000
  const STORE_PREFIX = "project_views:"

  const slug = e.request.pathValue("slug")
  if (!slug || slug.length > 200) {
    throw new NotFoundError("Project not found.")
  }

  const readViews = (app) => {
    const row = new DynamicModel({ views: 0 })
    app.db()
      .newQuery("SELECT COALESCE([[views]], 0) AS [[views]] FROM {{projects}} WHERE [[slug]] = {:slug} LIMIT 1")
      .bind({ slug: slug })
      .one(row) // throws sql.ErrNoRows when the slug doesn't exist
    return row.views
  }

  // Claim the (ip, slug) slot atomically — setFunc runs under the store lock,
  // so concurrent requests (e.g. React StrictMode's double effect) can't both
  // pass the check.
  const key = STORE_PREFIX + e.realIP() + ":" + slug
  const now = Date.now()
  const store = $app.store()
  let counted = false
  store.setFunc(key, (last) => {
    if (typeof last === "number" && now - last < VIEW_WINDOW_MS) return last
    counted = true
    return now
  })

  let views
  try {
    if (counted) {
      e.app.runInTransaction((txApp) => {
        txApp.db()
          .newQuery("UPDATE {{projects}} SET [[views]] = COALESCE([[views]], 0) + 1 WHERE [[slug]] = {:slug}")
          .bind({ slug: slug })
          .execute()
        views = readViews(txApp)
      })
    } else {
      views = readViews(e.app)
    }
  } catch (err) {
    // Unknown slug: don't keep a rate-limit entry for it.
    if (counted) store.remove(key)
    throw new NotFoundError("Project not found.")
  }

  return e.json(200, { views: views, counted: counted })
})

// Drop expired rate-limit entries so the in-memory store doesn't grow forever.
cronAdd("project_views_prune", "*/10 * * * *", () => {
  const VIEW_WINDOW_MS = 60 * 1000
  const STORE_PREFIX = "project_views:"

  const store = $app.store()
  const all = store.getAll()
  const now = Date.now()
  for (const key in all) {
    if (key.indexOf(STORE_PREFIX) !== 0) continue
    const ts = all[key]
    if (typeof ts !== "number" || now - ts >= VIEW_WINDOW_MS) {
      store.remove(key)
    }
  }
})
