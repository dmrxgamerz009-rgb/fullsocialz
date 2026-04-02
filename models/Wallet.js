// src/models/Wallet.js
const mongoose = require("mongoose");

const inventoryItemSchema = new mongoose.Schema(
  {
    itemId:    { type: String, required: true },
    name:      { type: String, required: true },
    emoji:     { type: String, default: "🎁" },
    quantity:  { type: Number, default: 1 },
    roleId:    { type: String, default: null }, // grants a role if set
  },
  { _id: false }
);

const walletSchema = new mongoose.Schema(
  {
    userId:  { type: String, required: true },
    guildId: { type: String, required: true },

    coins: { type: Number, default: 0 },

    // Daily/weekly streak tracking
    lastDaily:       { type: Date, default: null },
    dailyStreak:     { type: Number, default: 0 },
    lastWeekly:      { type: Date, default: null },

    // Work cooldown
    lastWork: { type: Date, default: null },

    // Rob cooldown + protection
    lastRob:         { type: Date, default: null },
    robProtectedUntil: { type: Date, default: null },

    // Inventory of shop items
    inventory: { type: [inventoryItemSchema], default: [] },

    // Active item effects
    hasBankPass:         { type: Boolean, default: false },  // raises coin cap
    investorsBriefActive:{ type: Boolean, default: false },  // next /work +50%
    lastGamble:          { type: Date, default: null },

    // Total earned lifetime (for stats)
    totalEarned: { type: Number, default: 0 },
    totalSpent:  { type: Number, default: 0 },
  },
  { timestamps: true }
);

walletSchema.index({ userId: 1, guildId: 1 }, { unique: true });

walletSchema.statics.findOrCreate = async function (userId, guildId) {
  let doc = await this.findOne({ userId, guildId });
  if (!doc) doc = await this.create({ userId, guildId });
  return doc;
};

// Add coins (and track lifetime earnings)
walletSchema.methods.addCoins = function (amount) {
  this.coins += amount;
  if (amount > 0) this.totalEarned += amount;
  if (amount < 0) this.totalSpent += Math.abs(amount);
  return this;
};

walletSchema.statics.getLeaderboard = async function (guildId, limit = 10) {
  return this.find({ guildId }).sort({ coins: -1 }).limit(limit).lean();
};

module.exports = mongoose.model("Wallet", walletSchema);
