// src/models/Appreciation.js
const mongoose = require("mongoose");

const appreciationSchema = new mongoose.Schema(
  {
    guildId:    { type: String, required: true, index: true },
    fromUserId: { type: String, required: true },
    toUserId:   { type: String, required: true },
    message:    { type: String, required: true, maxlength: 200 },
    anonymous:  { type: Boolean, default: false },
  },
  { timestamps: true }
);

appreciationSchema.index({ guildId: 1, toUserId: 1 });

// Auto-delete after 30 days to keep wall fresh
appreciationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model("Appreciation", appreciationSchema);
