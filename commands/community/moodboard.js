// src/commands/community/moodboard.js
const { SlashCommandBuilder } = require("discord.js");
const SocialStatus = require("../../models/SocialStatus");
const config = require("../../config");
const { infoContainer, errorContainer, componentReply, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moodboard")
    .setDescription("See the collective mood of the server right now 🎨"),

  async execute(interaction) {
    const guildId = interaction.guildId;

    const statuses = await SocialStatus.find({ guildId, status: { $ne: null }, private: false })
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();

    if (statuses.length === 0) {
      return componentReply(interaction,
        errorContainer("Empty moodboard", "No one has set a vibe yet! Use `/vibes set` to contribute.")
      );
    }

    // Tally moods
    const moodCount = {};
    for (const s of statuses) {
      const key = `${s.mood} ${s.status}`;
      moodCount[key] = (moodCount[key] ?? 0) + 1;
    }

    const sorted = Object.entries(moodCount).sort((a, b) => b[1] - a[1]);
    const topMood = sorted[0];
    const total   = statuses.length;

    const moodLines = sorted.slice(0, 8).map(([mood, count]) => {
      const pct = Math.round((count / total) * 100);
      const bar = "█".repeat(Math.round(pct / 10)).padEnd(10, "░");
      return `${mood} [${bar}] ${pct}%`;
    });

    // Recent status snapshots
    const recentLines = await Promise.all(
      statuses.slice(0, 5).map(async (s) => {
        let name = "Unknown";
        try { name = (await interaction.client.users.fetch(s.userId)).username; } catch {}
        return `${s.mood} **${name}** — ${s.status}`;
      })
    );

    const fields = [
      { name: `🎨 Dominant vibe: ${topMood[0]}`, value: moodLines.join("\n") },
      { name: "👥 Recent status updates", value: recentLines.join("\n") },
    ];

    return interaction.reply({
      components: [infoContainer(
        "🎨 Server moodboard",
        `Based on **${total}** recent status updates.`,
        { color: config.colors.purple, fields }
      )],
      flags: COMPONENTS_V2_FLAG,
    });
  },
};
