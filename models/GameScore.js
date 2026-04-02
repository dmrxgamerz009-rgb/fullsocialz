// src/models/GameScore.js
const mongoose = require("mongoose");

const gameScoreSchema = new mongoose.Schema(
  {
    userId:  { type: String, required: true },
    guildId: { type: String, required: true },

    trivia: {
      wins:   { type: Number, default: 0 },
      losses: { type: Number, default: 0 },
      streak: { type: Number, default: 0 },
    },
    rps: {
      wins:          { type: Number, default: 0 },
      losses:        { type: Number, default: 0 },
      ties:          { type: Number, default: 0 },
      currentStreak: { type: Number, default: 0 },
      bestStreak:    { type: Number, default: 0 },
    },
    guess: {
      wins:   { type: Number, default: 0 },
      losses: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

gameScoreSchema.index({ userId: 1, guildId: 1 }, { unique: true });

gameScoreSchema.statics.findOrCreate = async function (userId, guildId) {
  let doc = await this.findOne({ userId, guildId });
  if (!doc) doc = await this.create({ userId, guildId });
  return doc;
};

module.exports = mongoose.model("GameScore", gameScoreSchema);
