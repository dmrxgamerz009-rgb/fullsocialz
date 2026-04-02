// src/models/Reputation.js
const mongoose = require("mongoose");

const endorsementSchema = new mongoose.Schema(
  {
    fromUserId: { type: String, required: true },
    message:    { type: String, required: true, maxlength: 150 },
  },
  { _id: true, timestamps: { createdAt: true, updatedAt: false } }
);

const repLogSchema = new mongoose.Schema(
  {
    fromUserId: { type: String, required: true },
  },
  { _id: false, timestamps: { createdAt: "givenAt", updatedAt: false } }
);

const reputationSchema = new mongoose.Schema(
  {
    guildId:      { type: String, required: true, index: true },
    userId:       { type: String, required: true, index: true },
    points:       { type: Number, default: 0 },
    repsReceived: { type: Number, default: 0 },
    repsGiven:    { type: Number, default: 0 },
    endorsements: { type: [endorsementSchema], default: [] },
    repLog:       { type: [repLogSchema],      default: [] },
  },
  { timestamps: true }
);

reputationSchema.index({ userId: 1, guildId: 1 }, { unique: true });

reputationSchema.statics.findOrCreate = async function (userId, guildId) {
  let doc = await this.findOne({ userId, guildId });
  if (!doc) doc = await this.create({ userId, guildId });
  return doc;
};

reputationSchema.statics.getLeaderboard = async function (guildId, limit = 10) {
  return this.find({ guildId }).sort({ points: -1 }).limit(limit).lean();
};

module.exports = mongoose.model("Reputation", reputationSchema);