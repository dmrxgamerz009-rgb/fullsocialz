// src/models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    guildId: {
      type: String,
      required: true,
      index: true,
    },

    // ─── Profile ────────────────────────────────────────────────────────────
    username: { type: String, default: "Unknown User" },
    bio: { type: String, default: "No bio set yet.", maxlength: 200 },
    avatarUrl: { type: String, default: null },

    // ─── Social Stats ────────────────────────────────────────────────────────
    social: {
      hugsGiven: { type: Number, default: 0 },
      hugsReceived: { type: Number, default: 0 },
      patsGiven: { type: Number, default: 0 },
      patsReceived: { type: Number, default: 0 },
      kissesGiven: { type: Number, default: 0 },
      kissesReceived: { type: Number, default: 0 },
      slapsGiven: { type: Number, default: 0 },
      slapsReceived: { type: Number, default: 0 },
      interactionsTotal: { type: Number, default: 0 },
    },

    // ─── Reputation ─────────────────────────────────────────────────────────
    reputation: {
      points: { type: Number, default: 0 },
      given: { type: Number, default: 0 },       // How many reps they've given
      received: { type: Number, default: 0 },    // How many reps they've received
      endorsements: [
        {
          fromUserId: String,
          message: String,
          createdAt: { type: Date, default: Date.now },
        },
      ],
    },

    // ─── Social Connections ──────────────────────────────────────────────────
    bestFriends: { type: [String], default: [] },   // Array of userIds
    crushId: { type: String, default: null },        // Single crush userId

    // ─── Metadata ───────────────────────────────────────────────────────────
    joinedAt: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    // Compound index for efficient per-guild queries
  }
);

// Compound index: one profile per user per guild
userSchema.index({ userId: 1, guildId: 1 }, { unique: true });

// Static: find or create a user profile
userSchema.statics.findOrCreate = async function (userId, guildId, extraData = {}) {
  let user = await this.findOne({ userId, guildId });
  if (!user) {
    user = await this.create({ userId, guildId, ...extraData });
  }
  return user;
};

// Update lastSeen on fetch
userSchema.methods.touch = function () {
  this.lastSeen = new Date();
  return this.save();
};

module.exports = mongoose.model("User", userSchema);
