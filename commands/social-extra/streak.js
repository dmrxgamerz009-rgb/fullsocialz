// src/commands/social-extra/streak.js
const { SlashCommandBuilder } = require("discord.js");
const Wallet = require("../../models/Wallet");
const emojis = require("../../emojis");
const config = require("../../config");
const { infoContainer, componentReply, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("streak")
    .setDescription("Check your daily login streak 🔥")
    .addUserOption((o) => o.setName("user").setDescription("Check another user's streak (defaults to yourself)")),

  async execute(interaction) {
    const target = interaction.options.getUser("user") ?? interaction.user;
    const guildId = interaction.guildId;

    const wallet = await Wallet.findOrCreate(target.id, guildId);

    const streak     = wallet.dailyStreak ?? 0;
    const lastDaily  = wallet.lastDaily;
    const lastWeekly = wallet.lastWeekly;

    const nextDailyMs  = lastDaily  ? Math.max(0, lastDaily.getTime()  + config.economy.daily.cooldownMs  - Date.now()) : 0;
    const nextWeeklyMs = lastWeekly ? Math.max(0, lastWeekly.getTime() + config.economy.weekly.cooldownMs - Date.now()) : 0;

    const fmt = (ms) => {
      if (ms <= 0) return "**Ready now!**";
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      return `${h}h ${m}m`;
    };

    const streakBar = `[${"🔥".repeat(Math.min(streak, 10))}${"▱".repeat(Math.max(0, 10 - streak))}]`;
    const bonusCoins = Math.min(streak, config.economy.daily.maxStreak) * config.economy.daily.streakBonus;

    const fields = [
      { name: `${emojis.ui.fire} Daily streak`, value: `${streakBar} **${streak}** day(s)` },
      { name: `${config.economy.currencyEmoji} Streak bonus`, value: `+**${bonusCoins}** coins on next /daily` },
      { name: `⏰ Next /daily`, value: fmt(nextDailyMs) },
      { name: `⏰ Next /weekly`, value: fmt(nextWeeklyMs) },
      { name: `${config.economy.currencyEmoji} Lifetime earned`, value: `**${wallet.totalEarned.toLocaleString()}** coins` },
    ];

    return componentReply(interaction,
      infoContainer(
        `${emojis.ui.fire} ${target.username}'s streak`,
        `Keep claiming your daily to build up your streak!`,
        { color: config.colors.warning, fields, thumbnailUrl: target.displayAvatarURL({ dynamic: true }) }
      )
    );
  },
};
