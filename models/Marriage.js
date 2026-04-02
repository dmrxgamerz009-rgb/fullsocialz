// src/models/Marriage.js
const mongoose = require("mongoose");

const marriageSchema = new mongoose.Schema(
  {
    guildId: {
      type: String,
      required: true,
      index: true,
    },

    // Both partners stored; order doesn't matter
    partnerId1: { type: String, required: true },
    partnerId2: { type: String, required: true },

    // Who proposed
    proposerId: { type: String, required: true },

    // Marriage date (when accepted)
    marriedAt: { type: Date, default: Date.now },

    // Optional custom message left at proposal
    proposalMessage: { type: String, default: null, maxlength: 200 },

    // Active or divorced
    active: { type: Boolean, default: true, index: true },

    // Divorce details (kept for history)
    divorcedAt: { type: Date, default: null },
    divorcedBy: { type: String, default: null },
  },
  { timestamps: true }
);

// Compound index: quickly find if a user is married in a guild
marriageSchema.index({ guildId: 1, partnerId1: 1, active: 1 });
marriageSchema.index({ guildId: 1, partnerId2: 1, active: 1 });

// Static: find active marriage for a user
marriageSchema.statics.findActiveMarriage = async function (userId, guildId) {
  return this.findOne({
    guildId,
    active: true,
    $or: [{ partnerId1: userId }, { partnerId2: userId }],
  });
};

// Static: get the partner of a user
marriageSchema.methods.getPartner = function (userId) {
  return this.partnerId1 === userId ? this.partnerId2 : this.partnerId1;
};

// Method: get how long this marriage has lasted
marriageSchema.methods.getDuration = function () {
  const now = new Date();
  const diff = now - this.marriedAt;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return days;
};

module.exports = mongoose.model("Marriage", marriageSchema);
