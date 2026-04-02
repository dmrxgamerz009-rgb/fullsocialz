// src/models/Cooldown.js
// Tracks per-user cooldowns for any command/action
const mongoose = require("mongoose");

const cooldownSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true },

    // The user on cooldown
    userId: { type: String, required: true },

    // Command/action identifier, e.g. "rep:targetUserId" or "endorse:targetUserId"
    action: { type: String, required: true },

    // When this cooldown expires
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Compound unique index: one cooldown per user per action per guild
cooldownSchema.index({ userId: 1, guildId: 1, action: 1 }, { unique: true });

// Auto-delete expired documents via MongoDB TTL index
cooldownSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static: check if a user is on cooldown for an action
// Returns the cooldown doc if active, null if not
cooldownSchema.statics.check = async function (userId, guildId, action) {
  const doc = await this.findOne({ userId, guildId, action });
  if (!doc) return null;
  if (doc.expiresAt <= new Date()) {
    await doc.deleteOne();
    return null;
  }
  return doc;
};

// Static: set a cooldown for a user
cooldownSchema.statics.set = async function (userId, guildId, action, durationMs) {
  const expiresAt = new Date(Date.now() + durationMs);
  return this.findOneAndUpdate(
    { userId, guildId, action },
    { expiresAt },
    { upsert: true, new: true }
  );
};

// Static: get remaining time in ms
cooldownSchema.statics.getRemainingMs = async function (userId, guildId, action) {
  const doc = await this.check(userId, guildId, action);
  if (!doc) return 0;
  return Math.max(0, doc.expiresAt - Date.now());
};

// Helper: format ms into "Xh Xm Xs"
cooldownSchema.statics.formatTime = function (ms) {
  if (ms <= 0) return "now";
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 && hours === 0) parts.push(`${seconds}s`);
  return parts.join(" ");
};

module.exports = mongoose.model("Cooldown", cooldownSchema);
