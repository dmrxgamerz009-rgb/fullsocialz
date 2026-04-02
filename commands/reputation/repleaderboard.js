// src/commands/reputation/repleaderboard.js
// A richer alternative to /reputations — top 10 focused, visual bar display
const { SlashCommandBuilder } = require("discord.js");
const Reputation = require("../../models/Reputation");
const emojis = require("../../emojis");
const config = require("../../config");
const {
  infoContainer,
  errorContainer,
  componentReply,
  COMPONENTS_V2_FLAG,
} = require("../../utils/embedBuilder");

const RANK_ICONS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("repleaderboard")
    .setDescription("Top 10 most reputable members in the server 🏆"),

  async execute(interaction) {
    await interaction.deferReply();

    const guildId = interaction.guildId;

    const top10 = await Reputation.getLeaderboard(guildId, 10);

    if (top10.length === 0) {
      return interaction.editReply({
        components: [
          errorContainer(
            "Empty leaderboard",
            "No rep data yet! Start repping people with `/rep give`."
          ),
        ],
        flags: COMPONENTS_V2_FLAG,
      });
    }

    const maxPoints = top10[0].points || 1;

    const lines = await Promise.all(
      top10.map(async (entry, i) => {
        let name = "Unknown";
        try {
          const u = await interaction.client.users.fetch(entry.userId);
          name = u.username;
        } catch { /* gone */ }

        const barLen = Math.round((entry.points / maxPoints) * 12);
        const bar = `${"▰".repeat(barLen)}${"▱".repeat(12 - barLen)}`;
        const icon = RANK_ICONS[i];

        return `${icon} **${name}**\n   ${bar} ${emojis.reputation.rep} **${entry.points}** pts  •  ${entry.repsReceived} reps  •  ${entry.endorsements.length} endorsements`;
      })
    );

    // Caller's position
    const callerRep = await Reputation.findOne({ userId: interaction.user.id, guildId });
    const callerRank = callerRep
      ? (await Reputation.countDocuments({ guildId, points: { $gt: callerRep.points } })) + 1
      : null;

    const yourLine = callerRank
      ? `\n${emojis.profile.crown} You are **#${callerRank}** with **${callerRep?.points ?? 0}** pts`
      : `\n${emojis.profile.user} You haven't earned rep yet — try \`/rep give\` on someone first!`;

    const container = infoContainer(
      `${emojis.reputation.leaderboard} Rep leaderboard — Top 10`,
      `${lines.join("\n\n")}${yourLine}`,
      { color: config.colors.gold }
    );

    await interaction.editReply({ components: [container], flags: COMPONENTS_V2_FLAG });
  },
};
