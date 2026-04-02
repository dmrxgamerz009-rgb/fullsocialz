// src/commands/achievements/achievements.js
const { SlashCommandBuilder } = require("discord.js");
const Achievement = require("../../models/Achievement");
const { ACHIEVEMENTS } = require("../../models/Achievement");
const config = require("../../config");
const { infoContainer, errorContainer, componentReply, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("achievements")
    .setDescription("View your unlocked achievements 🏆")
    .addUserOption((o) => o.setName("user").setDescription("View another user's achievements")),

  async execute(interaction) {
    const target  = interaction.options.getUser("user") ?? interaction.user;
    const guildId = interaction.guildId;

    const doc = await Achievement.findOrCreate(target.id, guildId);
    const total = Object.keys(ACHIEVEMENTS).length;

    if (doc.unlocked.length === 0) {
      return componentReply(interaction,
        errorContainer("🏆 No achievements yet",
          `**${target.username}** hasn't unlocked any achievements. Start playing, socialising, and earning coins!`
        )
      );
    }

    const lines = doc.unlocked
      .sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt))
      .map((u) => {
        const ach = ACHIEVEMENTS[u.achievementId];
        if (!ach) return null;
        const ts = Math.floor(new Date(u.unlockedAt).getTime() / 1000);
        return `${ach.emoji} **${ach.name}** — ${ach.desc}\n  -# Unlocked <t:${ts}:R>`;
      })
      .filter(Boolean);

    const fields = [
      { name: "📊 Progress", value: `**${doc.unlocked.length}** / ${total} achievements unlocked` },
      { name: "🏆 Achievements", value: lines.slice(0, 10).join("\n\n") },
      ...(doc.activeTitle ? [{ name: "👑 Title", value: `**${doc.activeTitle}**` }] : []),
    ];

    return interaction.reply({
      components: [infoContainer(
        `🏆 ${target.username}'s achievements`,
        `Showing most recent unlocks first.`,
        { color: config.colors.gold, fields, thumbnailUrl: target.displayAvatarURL({ dynamic: true }) }
      )],
      flags: COMPONENTS_V2_FLAG,
    });
  },
};
