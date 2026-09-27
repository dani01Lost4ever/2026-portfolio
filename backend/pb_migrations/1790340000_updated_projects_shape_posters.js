/// <reference path="../pb_data/types.d.ts" />
// `projects.shape` now names a poster of the One Take design (the ShapeId union in
// src/lib/types.ts): the Field's own shapes go, `generic` comes in. Records still on a
// removed shape are cleared first, so the frontend falls back to its registry for them.
const FIELD_ID = "select2094817365"
const POSTERS = ["bug", "loop", "orbit", "candles", "globe", "clocks", "coins", "browser", "tictactoe", "battleship", "generic"]
const FIELD_SHAPES = ["grid", "bug", "loop", "orbit", "candles", "globe", "clocks", "coins", "browser", "tictactoe", "battleship", "clusters", "helix", "at", "constellation"]

function clearShapes(app, shapes) {
  const filter = shapes.map(s => `shape = '${s}'`).join(" || ")
  for (const record of app.findRecordsByFilter("projects", filter, "", 0, 0)) {
    record.set("shape", "")
    app.save(record)
  }
}

migrate((app) => {
  clearShapes(app, FIELD_SHAPES.filter(s => !POSTERS.includes(s)))
  const collection = app.findCollectionByNameOrId("projects")
  collection.fields.getById(FIELD_ID).values = POSTERS
  return app.save(collection)
}, (app) => {
  clearShapes(app, POSTERS.filter(s => !FIELD_SHAPES.includes(s)))
  const collection = app.findCollectionByNameOrId("projects")
  collection.fields.getById(FIELD_ID).values = FIELD_SHAPES
  return app.save(collection)
})
