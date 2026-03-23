/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("projects");

  collection.fields.addAt(99, new Field({
    "hidden": false,
    "id": "number_views",
    "max": null,
    "min": 0,
    "name": "views",
    "onlyInt": true,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("projects");
  collection.fields.removeById("number_views");
  return app.save(collection);
})
