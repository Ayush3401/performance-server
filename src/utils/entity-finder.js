const {
  createAPIFromDataset,
} = require("third-party-web/lib/create-entity-finder-api.js");
const entities = require("third-party-web/dist/entities.json");
const sprinklr_entities = require("../../sprinklr-entities.json");
module.exports = createAPIFromDataset([...entities, ...sprinklr_entities]);
