// src/models/Vow.js
const mongoose = require("mongoose");

const vowSchema = new mongoose.Schema(
  {
    guildId:    { type: String, required: true },
    fromUserId: { type: String, required: true },
    toUserId:   { type: String, required: true },
    vow:        { type: String, required: true, maxlength: 300 },
    public:     { type: Boolean, default: true },
  },
  { timestamps: true }
);

vowSchema.index({ guildId: 1, fromUserId: 1 });

module.exports = mongoose.model("Vow", vowSchema);
