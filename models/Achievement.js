// src/models/Achievement.js
const mongoose = require("mongoose");

// ── Master list of all achievements ──────────────────────────────────────────
const ACHIEVEMENTS = {
  // Social
  first_marriage:   { name: "Just Married",      emoji: "💍", desc: "Got married for the first time",        reward: 50  },
  first_adopt:      { name: "New Parent",         emoji: "👶", desc: "Adopted someone into your family",      reward: 30  },
  big_family:       { name: "Full House",         emoji: "🏡", desc: "Have 5 or more family members",         reward: 100 },
  hug_10:           { name: "Hugger",             emoji: "🤗", desc: "Given 10 hugs",                         reward: 20  },
  hug_50:           { name: "Hug Machine",        emoji: "🫂", desc: "Given 50 hugs",                         reward: 75  },
  bestfriend_max:   { name: "Squad Goals",        emoji: "👥", desc: "Filled your best friends list",         reward: 40  },
  anniversary_30:   { name: "One Month Strong",   emoji: "🌙", desc: "Married for 30 days",                   reward: 80  },
  anniversary_365:  { name: "One Year",           emoji: "🎉", desc: "Married for 365 days",                  reward: 500 },

  // Economy
  coins_1000:       { name: "Getting There",      emoji: "🪙", desc: "Accumulated 1,000 coins",               reward: 0   },
  coins_10000:      { name: "Loaded",             emoji: "💰", desc: "Accumulated 10,000 coins",              reward: 200 },
  coins_50000:      { name: "Whale",              emoji: "🐋", desc: "Hit the 50,000 coin cap",               reward: 1000},
  daily_7:          { name: "Week Streak",        emoji: "🔥", desc: "7-day daily streak",                    reward: 70  },
  daily_30:         { name: "Month Streak",       emoji: "🌟", desc: "30-day daily streak",                   reward: 300 },
  lottery_win:      { name: "Lucky!",             emoji: "🎟️", desc: "Won the lottery jackpot",               reward: 0   },
  first_rob:        { name: "Sneaky",             emoji: "🦹", desc: "Successfully robbed someone",           reward: 25  },

  // Reputation
  rep_10:           { name: "Rising Star",        emoji: "⭐", desc: "Earned 10 reputation points",           reward: 30  },
  rep_50:           { name: "Community Pillar",   emoji: "🏅", desc: "Earned 50 reputation points",           reward: 100 },
  rep_100:          { name: "Legendary",          emoji: "🌟", desc: "Earned 100 reputation points",          reward: 250 },
  first_endorse:    { name: "Endorsed",           emoji: "🎖️", desc: "Received your first endorsement",       reward: 20  },
  rep_giver_10:     { name: "Generous",           emoji: "💝", desc: "Given rep to 10 different people",      reward: 30  },

  // Games
  trivia_first:     { name: "Quiz Kid",           emoji: "🧠", desc: "Won your first trivia question",        reward: 15  },
  trivia_10:        { name: "Know-It-All",        emoji: "📚", desc: "Won 10 trivia questions",               reward: 50  },
  trivia_50:        { name: "Trivia Master",      emoji: "🏆", desc: "Won 50 trivia questions",               reward: 200 },
  rps_streak_5:     { name: "Unbeatable",         emoji: "✊", desc: "Won 5 RPS games in a row",              reward: 60  },

  // Community
  first_appreciate: { name: "Thankful Heart",     emoji: "💖", desc: "Sent your first appreciation",          reward: 10  },
  appreciated:      { name: "Cherished",          emoji: "🌸", desc: "Received 5 appreciations",              reward: 50  },
  spotlighted:      { name: "In the Spotlight",   emoji: "✨", desc: "Was spotlighted by the community",      reward: 75  },
  poll_creator:     { name: "Voice of the Server",emoji: "📊", desc: "Created 5 polls",                       reward: 40  },
};

const achievementSchema = new mongoose.Schema(
  {
    userId:  { type: String, required: true },
    guildId: { type: String, required: true },

    // Array of unlocked achievement IDs with timestamps
    unlocked: [
      {
        achievementId: { type: String, required: true },
        unlockedAt:    { type: Date,   default: Date.now },
      },
    ],

    // Custom title set by user (from achievements)
    activeTitle: { type: String, default: null },

    // Counters used for achievement tracking
    triviaWins:    { type: Number, default: 0 },
    rpsCurrentWinStreak: { type: Number, default: 0 },
    rpsBestStreak: { type: Number, default: 0 },
    appreciationsSent:     { type: Number, default: 0 },
    appreciationsReceived: { type: Number, default: 0 },
    pollsCreated: { type: Number, default: 0 },
  },
  { timestamps: true }
);

achievementSchema.index({ userId: 1, guildId: 1 }, { unique: true });

achievementSchema.statics.findOrCreate = async function (userId, guildId) {
  let doc = await this.findOne({ userId, guildId });
  if (!doc) doc = await this.create({ userId, guildId });
  return doc;
};

// Check + unlock an achievement. Returns the achievement if newly unlocked, null if already had it.
achievementSchema.statics.unlock = async function (userId, guildId, achievementId) {
  const doc = await this.findOrCreate(userId, guildId);
  const alreadyHas = doc.unlocked.some((u) => u.achievementId === achievementId);
  if (alreadyHas) return null;

  doc.unlocked.push({ achievementId });
  await doc.save();
  return ACHIEVEMENTS[achievementId] ?? null;
};

module.exports = mongoose.model("Achievement", achievementSchema);
module.exports.ACHIEVEMENTS = ACHIEVEMENTS;
