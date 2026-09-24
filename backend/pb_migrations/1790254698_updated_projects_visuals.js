/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("projects");

  collection.fields.addAt(99, new Field({
    "hidden": false,
    "id": "select2094817365",
    "maxSelect": 1,
    "name": "shape",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "grid",
      "bug",
      "loop",
      "orbit",
      "candles",
      "globe",
      "clocks",
      "coins",
      "browser",
      "tictactoe",
      "battleship",
      "clusters",
      "helix",
      "at",
      "constellation"
    ]
  }));

  collection.fields.addAt(100, new Field({
    "hidden": false,
    "id": "json3049582716",
    "maxSize": 5000000,
    "name": "layers",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }));

  collection.fields.addAt(101, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text9284710365",
    "max": 0,
    "min": 0,
    "name": "caption",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("projects");

  collection.fields.removeById("select2094817365");
  collection.fields.removeById("json3049582716");
  collection.fields.removeById("text9284710365");

  return app.save(collection);
})
