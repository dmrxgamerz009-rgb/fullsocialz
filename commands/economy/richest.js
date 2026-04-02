// src/commands/economy/richest.js
const { SlashCommandBuilder } = require("discord.js");
const Wallet = require("../../models/Wallet");
const config = require("../../config");
const { infoContainer, errorContainer, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

const MEDALS = ["🥇", "🥈", "🥉"];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("richest")
    .setDescription("Top 10 richest members in the server 💰"),

  async execute(interaction) {
    await interaction.deferReply();
    const guildId = interaction.guildId;

    const top = await Wallet.getLeaderboard(guildId, 10);

    if (top.length === 0) {
      return interaction.editReply({
        components: [errorContainer("No data", "No one has earned coins yet. Start with `/daily`!")],
        flags: COMPONENTS_V2_FLAG,
      });
    }

    const lines = await Promise.all(
      top.map(async (w, i) => {
        let name = "Unknown";
        try { name = (await interaction.client.users.fetch(w.userId)).username; } catch {}
        const medal = MEDALS[i] ?? `**#${i + 1}**`;
        const bar   = "█".repeat(Math.round((w.coins / (top[0].coins || 1)) * 10)).padEnd(10, "░");
        return `${medal} **${name}**\n   [${bar}] ${config.economy.currencyEmoji} **${w.coins.toLocaleString()}**`;
      })
    );

    // Caller's rank
    const callerWallet = await Wallet.findOne({ userId: interaction.user.id, guildId });
    const callerRank   = callerWallet
      ? (await Wallet.countDocuments({ guildId, coins: { $gt: callerWallet.coins } })) + 1
      : null;

    const yourLine = callerRank
      ? `\n${config.economy.currencyEmoji} You are **#${callerRank}** with **${callerWallet.coins.toLocaleString()}** coins`
      : `\nYou haven't earned any coins yet — try \`/daily\`!`;

    return interaction.editReply({
      components: [infoContainer(
        `💰 Richest members`,
        `${lines.join("\n\n")}${yourLine}`,
        { color: config.colors.gold }
      )],
      flags: COMPONENTS_V2_FLAG,
    });
  },
};
