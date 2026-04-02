// src/models/Family.js
// Tracks parent → child relationships (adoption, ownership)
const mongoose = require("mongoose");

const familySchema = new mongoose.Schema(
  {
    guildId: {
      type: String,
      required: true,
      index: true,
    },

    // The parent user
    parentId: {
      type: String,
      required: true,
      index: true,
    },

    // The child user
    childId: {
      type: String,
      required: true,
      index: true,
    },

    // Relationship type
    relationshipType: {
      type: String,
      enum: ["adopted", "owned"],   // "adopted" = /adopt, "owned" = /own
      required: true,
    },

    // Who initiated
    initiatedBy: { type: String, required: true },

    // Optional message during adoption/claim
    message: { type: String, default: null, maxlength: 150 },

    // Active flag (set false on /disown)
    active: { type: Boolean, default: true, index: true },

    // Disown details
    disownedAt: { type: Date, default: null },
    disownedBy: { type: String, default: null },
  },
  { timestamps: true }
);

// Indexes for efficient family tree lookups
familySchema.index({ guildId: 1, parentId: 1, active: 1 });
familySchema.index({ guildId: 1, childId: 1, active: 1 });
familySchema.index({ guildId: 1, parentId: 1, childId: 1, active: 1 }, { unique: false });

// Static: get all active children of a parent
familySchema.statics.getChildren = async function (parentId, guildId) {
  return this.find({ parentId, guildId, active: true });
};

// Static: get the parent of a child (if any)
familySchema.statics.getParent = async function (childId, guildId) {
  return this.findOne({ childId, guildId, active: true });
};

// Static: check if a relationship already exists
familySchema.statics.relationshipExists = async function (parentId, childId, guildId) {
  return this.findOne({ parentId, childId, guildId, active: true });
};

// Static: get a user's full family snapshot
familySchema.statics.getFamilySnapshot = async function (userId, guildId) {
  const [asParent, asChild] = await Promise.all([
    this.find({ parentId: userId, guildId, active: true }),
    this.findOne({ childId: userId, guildId, active: true }),
  ]);
  return { children: asParent, parent: asChild };
};

module.exports = mongoose.model("Family", familySchema);
