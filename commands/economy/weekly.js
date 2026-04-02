// src/commands/economy/weekly.js
const { SlashCommandBuilder } = require("discord.js");
const Wallet = require("../../models/Wallet");
const Transaction = require("../../models/Transaction");
const config = require("../../config");
const { successContainer, errorContainer, componentReply, formatTime } = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("weekly")
    .setDescription(`Claim your weekly bonus coins ${config.economy?.currencyEmoji ?? "🪙"}`),

  async execute(interaction) {
    const userId  = interaction.user.id;
    const guildId = interaction.guildId;
    const cfg     = config.economy.weekly;

    const wallet = await Wallet.findOrCreate(userId, guildId);

    if (wallet.lastWeekly) {
      const remaining = wallet.lastWeekly.getTime() + cfg.cooldownMs - Date.now();
      if (remaining > 0) {
        return componentReply(interaction,
          errorContainer(`⏰ Not yet!`, `Your weekly bonus is available in **${formatTime(remaining)}**.`),
          { ephemeral: true }
        );
      }
    }

    wallet.addCoins(cfg.base);
    wallet.lastWeekly = new Date();
    await wallet.save();

    await Transaction.log({ guildId, fromUserId: userId, toUserId: null, amount: cfg.base, type: "weekly" });

    return componentReply(interaction,
      successContainer(
        `${config.economy.currencyEmoji} Weekly bonus!`,
        `You claimed your weekly **${cfg.base}** coins! 🎉\n\n**Balance: ${wallet.coins.toLocaleString()} coins**\nCome back in 6 days for your next weekly!`
      )
    );
  },
};
