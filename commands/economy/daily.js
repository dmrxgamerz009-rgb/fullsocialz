// src/commands/economy/daily.js
const { SlashCommandBuilder } = require("discord.js");
const Wallet = require("../../models/Wallet");
const Marriage = require("../../models/Marriage");
const Transaction = require("../../models/Transaction");
const emojis = require("../../emojis");
const config = require("../../config");
const { successContainer, errorContainer, componentReply, formatTime, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription(`Claim your daily coins ${config.economy?.currencyEmoji ?? "🪙"}`),

  async execute(interaction) {
    const userId  = interaction.user.id;
    const guildId = interaction.guildId;
    const cfg     = config.economy.daily;

    const wallet = await Wallet.findOrCreate(userId, guildId);

    // Cooldown check
    if (wallet.lastDaily) {
      const remaining = wallet.lastDaily.getTime() + cfg.cooldownMs - Date.now();
      if (remaining > 0) {
        return componentReply(interaction,
          errorContainer(`${emojis.reputation.cooldown} Come back later!`,
            `Your next daily is available in **${formatTime(remaining)}**.`),
          { ephemeral: true }
        );
      }
    }

    // Streak logic
    const now = Date.now();
    const streakBroken = wallet.lastDaily && (now - wallet.lastDaily.getTime()) > cfg.cooldownMs * 2;
    const newStreak = streakBroken ? 1 : (wallet.dailyStreak ?? 0) + 1;

    // Calculate reward
    const streakBonus = Math.min(newStreak, cfg.maxStreak) * cfg.streakBonus;
    let reward = cfg.base + streakBonus;

    // Check lucky charm in inventory
    const charmIdx = wallet.inventory.findIndex((i) => i.itemId === "lucky_charm" && i.quantity > 0);
    let charmUsed = false;
    if (charmIdx !== -1) {
      reward *= 2;
      wallet.inventory[charmIdx].quantity -= 1;
      if (wallet.inventory[charmIdx].quantity <= 0) wallet.inventory.splice(charmIdx, 1);
      charmUsed = true;
    }

    // Marriage bonus
    const marriage = await Marriage.findActiveMarriage(userId, guildId);
    const marriageBonus = marriage ? cfg.marriageBonus : 0;
    reward += marriageBonus;

    wallet.addCoins(reward);
    wallet.lastDaily   = new Date();
    wallet.dailyStreak = newStreak;
    await wallet.save();

    await Transaction.log({ guildId, fromUserId: userId, toUserId: null, amount: reward, type: "daily" });

    const lines = [
      `${config.economy.currencyEmoji} Base: **+${cfg.base}**`,
      streakBonus > 0 ? `${emojis.ui.fire} Streak (day ${newStreak}): **+${streakBonus}**` : null,
      marriageBonus > 0 ? `${emojis.marriage.ring} Marriage bonus: **+${marriageBonus}**` : null,
      charmUsed ? `🍀 Lucky Charm (2x): applied!` : null,
      streakBroken ? `\n-# ⚠️ Your streak was reset. Claim daily within 48h to keep it!` : null,
    ].filter(Boolean).join("\n");

    return componentReply(interaction,
      successContainer(
        `${config.economy.currencyEmoji} Daily claimed!`,
        `You received **${reward}** coins!\n\n${lines}\n\n**New balance: ${wallet.coins.toLocaleString()} coins**`,
        { thumbnailUrl: interaction.user.displayAvatarURL({ dynamic: true }) }
      )
    );
  },
};
