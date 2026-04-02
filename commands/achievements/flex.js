// src/commands/achievements/flex.js
const { SlashCommandBuilder } = require("discord.js");
const Achievement = require("../../models/Achievement");
const { ACHIEVEMENTS } = require("../../models/Achievement");
const Wallet  = require("../../models/Wallet");
const config  = require("../../config");
const { infoContainer, errorContainer, componentReply, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("flex")
    .setDescription("Flex your rarest achievement 💎")
    .addUserOption((o) => o.setName("user").setDescription("Flex someone else's achievements")),

  async execute(interaction) {
    const target  = interaction.options.getUser("user") ?? interaction.user;
    const guildId = interaction.guildId;

    const [doc, wallet] = await Promise.all([
      Achievement.findOrCreate(target.id, guildId),
      Wallet.findOrCreate(target.id, guildId),
    ]);

    if (doc.unlocked.length === 0) {
      return componentReply(interaction,
        errorContainer("Nothing to flex!", `**${target.username}** hasn't unlocked any achievements yet.`),
        { ephemeral: true }
      );
    }

    // Rarest = last in the ACHIEVEMENTS object order (hardest ones at the bottom)
    const allIds   = Object.keys(ACHIEVEMENTS);
    const myIds    = new Set(doc.unlocked.map((u) => u.achievementId));
    const rarest   = [...allIds].reverse().find((id) => myIds.has(id));
    const achData  = ACHIEVEMENTS[rarest];
    const unlockedAt = doc.unlocked.find((u) => u.achievementId === rarest)?.unlockedAt;
    const ts       = Math.floor(new Date(unlockedAt).getTime() / 1000);

    const fields = [
      { name: `${achData.emoji} Rarest achievement`, value: `**${achData.name}**\n${achData.desc}` },
      { name: "📅 Unlocked", value: `<t:${ts}:R>` },
      { name: "🏆 Total achievements", value: `**${doc.unlocked.length}** / ${allIds.length}` },
      { name: `${config.economy.currencyEmoji} Coins`, value: `**${wallet.coins.toLocaleString()}**` },
      ...(doc.activeTitle ? [{ name: "👑 Title", value: `**${doc.activeTitle}**` }] : []),
    ];

    return interaction.reply({
      components: [infoContainer(
        `💎 ${target.username} is flexing!`,
        `Check out **${target.username}'s** rarest achievement:`,
        { color: config.colors.gold, fields, thumbnailUrl: target.displayAvatarURL({ dynamic: true }) }
      )],
      flags: COMPONENTS_V2_FLAG,
    });
  },
};
