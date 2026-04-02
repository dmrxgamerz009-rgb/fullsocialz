// src/models/SocialStatus.js
const mongoose = require("mongoose");

const socialStatusSchema = new mongoose.Schema(
  {
    userId:  { type: String, required: true },
    guildId: { type: String, required: true },

    // Custom status message
    status:  { type: String, default: null, maxlength: 120 },
    mood:    { type: String, default: "😊", maxlength: 10 }, // emoji mood
    color:   { type: Number, default: null }, // accent color int

    // Visibility
    private: { type: Boolean, default: false },
  },
  { timestamps: true }
);

socialStatusSchema.index({ userId: 1, guildId: 1 }, { unique: true });

socialStatusSchema.statics.findOrCreate = async function (userId, guildId) {
  let doc = await this.findOne({ userId, guildId });
  if (!doc) doc = await this.create({ userId, guildId });
  return doc;
};

module.exports = mongoose.model("SocialStatus", socialStatusSchema);
