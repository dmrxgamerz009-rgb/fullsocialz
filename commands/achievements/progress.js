// src/commands/achievements/progress.js
const { SlashCommandBuilder } = require("discord.js");
const Achievement = require("../../models/Achievement");
const { ACHIEVEMENTS } = require("../../models/Achievement");
const GameScore   = require("../../models/GameScore");
const Reputation  = require("../../models/Reputation");
const Wallet      = require("../../models/Wallet");
const User        = require("../../models/User");
const config      = require("../../config");
const { infoContainer, componentReply, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("progress")
    .setDescription("See your progress toward the next achievements 📈"),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId  = interaction.user.id;

    const [doc, scores, repData, wallet, userData] = await Promise.all([
      Achievement.findOrCreate(userId, guildId),
      GameScore.findOrCreate(userId, guildId),
      Reputation.findOrCreate(userId, guildId),
      Wallet.findOrCreate(userId, guildId),
      User.findOrCreate(userId, guildId, { username: interaction.user.username }),
    ]);

    const unlocked = new Set(doc.unlocked.map((u) => u.achievementId));

    const rows = [];

    // Economy: coin milestones
    const coinMilestones = [["coins_1000", 1000], ["coins_10000", 10000], ["coins_50000", 50000]];
    for (const [id, target] of coinMilestones) {
      if (!unlocked.has(id)) {
        const pct = Math.min(100, Math.floor((wallet.coins / target) * 100));
        rows.push(`🪙 **Coins ${target.toLocaleString()}** — ${wallet.coins.toLocaleString()} / ${target.toLocaleString()} [${bar(pct)}] ${pct}%`);
        break;
      }
    }

    // Reputation milestones
    const repMilestones = [["rep_10", 10], ["rep_50", 50], ["rep_100", 100]];
    for (const [id, target] of repMilestones) {
      if (!unlocked.has(id)) {
        const pct = Math.min(100, Math.floor((repData.points / target) * 100));
        rows.push(`⭐ **Rep ${target}** — ${repData.points} / ${target} [${bar(pct)}] ${pct}%`);
        break;
      }
    }

    // Trivia milestones
    const triviaMilestones = [["trivia_first", 1], ["trivia_10", 10], ["trivia_50", 50]];
    for (const [id, target] of triviaMilestones) {
      if (!unlocked.has(id)) {
        const pct = Math.min(100, Math.floor((scores.trivia.wins / target) * 100));
        rows.push(`🧠 **Trivia wins ${target}** — ${scores.trivia.wins} / ${target} [${bar(pct)}] ${pct}%`);
        break;
      }
    }

    // Hug milestones
    const hugMilestones = [["hug_10", 10], ["hug_50", 50]];
    for (const [id, target] of hugMilestones) {
      if (!unlocked.has(id)) {
        const given = userData.social?.hugsGiven ?? 0;
        const pct = Math.min(100, Math.floor((given / target) * 100));
        rows.push(`🤗 **Hugs ${target}** — ${given} / ${target} [${bar(pct)}] ${pct}%`);
        break;
      }
    }

    // Daily streak
    if (!unlocked.has("daily_30")) {
      const target = unlocked.has("daily_7") ? 30 : 7;
      const streak = wallet.dailyStreak ?? 0;
      const pct = Math.min(100, Math.floor((streak / target) * 100));
      rows.push(`🔥 **${target}-day streak** — ${streak} / ${target} [${bar(pct)}] ${pct}%`);
    }

    const total   = Object.keys(ACHIEVEMENTS).length;
    const earned  = unlocked.size;
    const overall = Math.floor((earned / total) * 100);

    const fields = [
      { name: "📊 Overall", value: `**${earned}/${total}** achievements [${bar(overall)}] ${overall}%` },
      { name: "🎯 Next to unlock", value: rows.length > 0 ? rows.join("\n\n") : "🎉 You're crushing it! Check `/badges` for any remaining." },
    ];

    return interaction.reply({
      components: [infoContainer(
        "📈 Achievement progress",
        "Here's how close you are to your next unlocks.",
        { color: config.colors.purple, fields, thumbnailUrl: interaction.user.displayAvatarURL({ dynamic: true }) }
      )],
      flags: COMPONENTS_V2_FLAG,
    });
  },
};

function bar(pct) {
  const filled = Math.round(pct / 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}
