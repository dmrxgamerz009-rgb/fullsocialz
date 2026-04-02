// src/commands/achievements/rank.js
const { SlashCommandBuilder } = require("discord.js");
const Achievement = require("../../models/Achievement");
const { ACHIEVEMENTS } = require("../../models/Achievement");
const Reputation  = require("../../models/Reputation");
const Wallet      = require("../../models/Wallet");
const GameScore   = require("../../models/GameScore");
const config      = require("../../config");
const { infoContainer, componentReply, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("View your overall community rank 🏅")
    .addUserOption((o) => o.setName("user").setDescription("Check another user's rank")),

  async execute(interaction) {
    const target  = interaction.options.getUser("user") ?? interaction.user;
    const guildId = interaction.guildId;

    const [doc, repData, wallet, scores] = await Promise.all([
      Achievement.findOrCreate(target.id, guildId),
      Reputation.findOrCreate(target.id, guildId),
      Wallet.findOrCreate(target.id, guildId),
      GameScore.findOrCreate(target.id, guildId),
    ]);

    // Composite score: rep×10 + coins/100 + achievements×5 + triviaWins×2
    const score = repData.points * 10
      + Math.floor(wallet.coins / 100)
      + doc.unlocked.length * 5
      + scores.trivia.wins * 2;

    // Guild rank by composite
    const allWallets = await Wallet.find({ guildId }).lean();
    const allReps    = await Reputation.find({ guildId }).lean();
    const allAchs    = await Achievement.find({ guildId }).lean();
    const allScores  = await GameScore.find({ guildId }).lean();

    const memberScores = allWallets.map((w) => {
      const rep = allReps.find((r) => r.userId === w.userId)?.points ?? 0;
      const ach = allAchs.find((a) => a.userId === w.userId)?.unlocked?.length ?? 0;
      const tri = allScores.find((s) => s.userId === w.userId)?.trivia?.wins ?? 0;
      return rep * 10 + Math.floor(w.coins / 100) + ach * 5 + tri * 2;
    });

    memberScores.sort((a, b) => b - a);
    const rank  = memberScores.indexOf(score) + 1;
    const total = memberScores.length;
    const pct   = Math.max(1, Math.floor((1 - (rank - 1) / total) * 100));

    const tier = getTier(score);
    const totalAch = Object.keys(ACHIEVEMENTS).length;

    const fields = [
      { name: "🏅 Server rank",    value: `**#${rank}** of ${total} members` },
      { name: "✨ Tier",           value: `${tier.emoji} **${tier.name}**` },
      { name: "📊 Score",          value: `**${score.toLocaleString()}** pts` },
      { name: "📈 Percentile",     value: `Top **${pct}%** of the server` },
      { name: "⭐ Reputation",     value: `**${repData.points}** pts` },
      { name: `${config.economy.currencyEmoji} Coins`, value: `**${wallet.coins.toLocaleString()}**` },
      { name: "🏆 Achievements",   value: `**${doc.unlocked.length}** / ${totalAch}` },
      { name: "🧠 Trivia wins",    value: `**${scores.trivia.wins}**` },
    ];

    return interaction.reply({
      components: [infoContainer(
        `🏅 ${target.username}'s rank`,
        `Overall community standing for **${target.username}**.`,
        { color: config.colors.gold, fields, thumbnailUrl: target.displayAvatarURL({ dynamic: true }) }
      )],
      flags: COMPONENTS_V2_FLAG,
    });
  },
};

function getTier(score) {
  if (score >= 5000) return { name: "Grandmaster", emoji: "👑" };
  if (score >= 2000) return { name: "Elite",       emoji: "💎" };
  if (score >= 800)  return { name: "Veteran",     emoji: "🥇" };
  if (score >= 300)  return { name: "Member",      emoji: "🥈" };
  if (score >= 100)  return { name: "Newcomer",    emoji: "🥉" };
  return               { name: "Starter",      emoji: "🌱" };
}
