// src/models/Diary.js
const mongoose = require("mongoose");

const diaryEntrySchema = new mongoose.Schema(
  {
    userId:  { type: String, required: true },
    guildId: { type: String, required: true },
    title:   { type: String, required: true, maxlength: 80 },
    content: { type: String, required: true, maxlength: 1000 },
    mood:    { type: String, default: "📝", maxlength: 10 },
    private: { type: Boolean, default: true },
  },
  { timestamps: true }
);

diaryEntrySchema.index({ userId: 1, guildId: 1 });

// Most recent entries first
diaryEntrySchema.statics.getUserEntries = async function (userId, guildId, limit = 5) {
  return this.find({ userId, guildId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

module.exports = mongoose.model("DiaryEntry", diaryEntrySchema);
