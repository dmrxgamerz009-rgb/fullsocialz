// src/commands/economy/balance.js
const { SlashCommandBuilder } = require("discord.js");
const Wallet = require("../../models/Wallet");
const emojis = require("../../emojis");
const config = require("../../config");
const { infoContainer, componentReply, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription(`Check your coin balance ${config.economy?.currencyEmoji ?? "🪙"}`)
    .addUserOption((o) => o.setName("user").setDescription("Check another user's balance (defaults to yourself)")),

  async execute(interaction) {
    const target = interaction.options.getUser("user") ?? interaction.user;
    const guildId = interaction.guildId;

    const wallet = await Wallet.findOrCreate(target.id, guildId);

    // Rank by coins
    const rank = (await Wallet.countDocuments({ guildId, coins: { $gt: wallet.coins } })) + 1;
    const total = await Wallet.countDocuments({ guildId });

    const cap = wallet.hasBankPass ? 50_000 : 10_000;
    const capLine = wallet.hasBankPass ? "💼 Bank Pass active" : "Standard";

    const fields = [
      { name: `${config.economy.currencyEmoji} Balance`, value: `**${wallet.coins.toLocaleString()}** coins` },
      { name: `${emojis.reputation.leaderboard} Rank`, value: `**#${rank}** of ${total} members` },
      { name: `${emojis.ui.fire} Daily streak`, value: `**${wallet.dailyStreak}** day(s)` },
      { name: `${emojis.ui.gem} Lifetime earned`, value: `**${wallet.totalEarned.toLocaleString()}** coins` },
      { name: `${emojis.ui.coin} Lifetime spent`, value: `**${wallet.totalSpent.toLocaleString()}** coins` },
      { name: `💼 Coin cap`, value: `**${cap.toLocaleString()}** (${capLine})` },
    ];

    return componentReply(interaction,
      infoContainer(
        `${config.economy.currencyEmoji} ${target.username}'s balance`,
        `Here's the wallet breakdown for **${target.username}**.`,
        { color: config.colors.gold, fields, thumbnailUrl: target.displayAvatarURL({ dynamic: true }) }
      )
    );
  },
};
