// src/models/Transaction.js
const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    guildId:    { type: String, required: true, index: true },
    fromUserId: { type: String, required: true },
    toUserId:   { type: String, default: null },       // null = system (daily, work, etc.)
    amount:     { type: Number, required: true },
    type:       {
      type: String,
      enum: ["daily", "weekly", "work", "pay", "rob", "gamble", "slots", "coinflip", "buy", "gift", "rep_reward"],
      required: true,
    },
    note:       { type: String, default: null, maxlength: 100 },
  },
  { timestamps: true }
);

transactionSchema.index({ guildId: 1, fromUserId: 1 });
// Auto-delete after 30 days to keep DB clean
transactionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

transactionSchema.statics.log = async function (data) {
  return this.create(data);
};

module.exports = mongoose.model("Transaction", transactionSchema);
