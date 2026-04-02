// src/commands/anime/poke.js
const { buildInteractionCommand, INTERACTIONS } = require("../../utils/animeInteraction");
module.exports = buildInteractionCommand("poke", INTERACTIONS["poke"]);
