/// <reference path="../pb_data/types.d.ts" />
// `projects.shape` gains the Lumen poster (the ShapeId union in src/lib/types.ts).
const FIELD_ID = "select2094817365"
const BEFORE = ["bug", "loop", "orbit", "candles", "globe", "clocks", "coins", "browser", "tictactoe", "battleship", "generic"]
const AFTER = ["bug", "lumen", "loop", "orbit", "candles", "globe", "clocks", "coins", "browser", "tictactoe", "battleship", "generic"]

migrate((app) => {
  const collection = app.findCollectionByNameOrId("projects")
  collection.fields.getById(FIELD_ID).values = AFTER
  return app.save(collection)
}, (app) => {
  for (const record of app.findRecordsByFilter("projects", "shape = 'lumen'", "", 0, 0)) {
    record.set("shape", "")
    app.save(record)
  }
  const collection = app.findCollectionByNameOrId("projects")
  collection.fields.getById(FIELD_ID).values = BEFORE
  return app.save(collection)
})
