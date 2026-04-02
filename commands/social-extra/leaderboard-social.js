// src/commands/social-extra/leaderboard-social.js
const { SlashCommandBuilder } = require("discord.js");
const Reputation = require("../../models/Reputation");
const Wallet = require("../../models/Wallet");
const User = require("../../models/User");
const emojis = require("../../emojis");
const config = require("../../config");
const { infoContainer, errorContainer, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

const MEDALS = ["🥇", "🥈", "🥉"];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View server leaderboards 🏆")
    .addStringOption((o) =>
      o.setName("type")
        .setDescription("What to rank by")
        .addChoices(
          { name: "💰 Richest (coins)", value: "coins" },
          { name: "⭐ Most reputable", value: "rep" },
          { name: "🤗 Most social (interactions)", value: "social" },
        )
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const type = interaction.options.getString("type");
    const guildId = interaction.guildId;

    let lines = [], title = "", description = "";

    if (type === "coins") {
      const top = await Wallet.getLeaderboard(guildId, 10);
      title = `${config.economy.currencyEmoji} Richest members`;
      description = "Top 10 wealthiest people in the server.";
      lines = await Promise.all(top.map(async (w, i) => {
        const name = await resolveUsername(interaction.client, w.userId);
        const medal = MEDALS[i] ?? `**#${i + 1}**`;
        return `${medal} **${name}** — ${config.economy.currencyEmoji} **${w.coins.toLocaleString()}** coins`;
      }));
    }

    if (type === "rep") {
      const top = await Reputation.getLeaderboard(guildId, 10);
      title = `${emojis.reputation.leaderboard} Most reputable`;
      description = "Top 10 by reputation points.";
      lines = await Promise.all(top.map(async (r, i) => {
        const name = await resolveUsername(interaction.client, r.userId);
        const medal = MEDALS[i] ?? `**#${i + 1}**`;
        return `${medal} **${name}** — ${emojis.reputation.rep} **${r.points}** pts`;
      }));
    }

    if (type === "social") {
      const top = await User.find({ guildId })
        .sort({ "social.interactionsTotal": -1 })
        .limit(10)
        .lean();
      title = `${emojis.anime.hug} Most social`;
      description = "Top 10 by total anime interactions given.";
      lines = top.map((u, i) => {
        const medal = MEDALS[i] ?? `**#${i + 1}**`;
        return `${medal} **${u.username}** — **${u.social?.interactionsTotal ?? 0}** interactions`;
      });
    }

    if (lines.length === 0) {
      return interaction.editReply({
        components: [errorContainer("No data yet", "No one has stats in this category yet!")],
        flags: COMPONENTS_V2_FLAG,
      });
    }

    return interaction.editReply({
      components: [infoContainer(title, description, {
        color: config.colors.gold,
        fields: [{ name: "Rankings", value: lines.join("\n") }],
      })],
      flags: COMPONENTS_V2_FLAG,
    });
  },
};

async function resolveUsername(client, userId) {
  try { return (await client.users.fetch(userId)).username; }
  catch { return "Unknown"; }
}
