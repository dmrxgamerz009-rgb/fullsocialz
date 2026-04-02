// src/commands/reputation/reputations.js
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

const MEDALS = [
  emojis.reputation.gold,
  emojis.reputation.silver,
  emojis.reputation.bronze,
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reputations")
    .setDescription("View the server reputation leaderboard 🏆")
    .addIntegerOption((o) =>
      o
        .setName("page")
        .setDescription("Page number (default: 1)")
        .setMinValue(1)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const guildId = interaction.guildId;
    const page = (interaction.options.getInteger("page") ?? 1) - 1;
    const pageSize = config.reputation.leaderboardSize;
    const skip = page * pageSize;

    const [entries, total] = await Promise.all([
      Reputation.find({ guildId })
        .sort({ points: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Reputation.countDocuments({ guildId }),
    ]);

    if (entries.length === 0) {
      return interaction.editReply({
        components: [
          errorContainer(
            "No data yet",
            "No one has received reputation in this server yet. Use `/rep give` to start!"
          ),
        ],
        flags: COMPONENTS_V2_FLAG,
      });
    }

    const totalPages = Math.ceil(total / pageSize);

    const lines = await Promise.all(
      entries.map(async (entry, i) => {
        const rank = skip + i + 1;
        const medal = MEDALS[rank - 1] ?? emojis.numbers[rank] ?? `**#${rank}**`;
        let username = "Unknown";
        try {
          const u = await interaction.client.users.fetch(entry.userId);
          username = u.username;
        } catch { /* user left */ }

        const bar = buildBar(entry.points);
        return `${medal} **${username}** — ${emojis.reputation.rep} ${entry.points} pts  ${bar}`;
      })
    );

    // Find calling user's rank
    const callerRep = await Reputation.findOne({ userId: interaction.user.id, guildId });
    const callerRank = callerRep
      ? (await Reputation.countDocuments({ guildId, points: { $gt: callerRep.points } })) + 1
      : null;

    const footerNote = callerRank
      ? `\n\n${emojis.profile.crown} Your rank: **#${callerRank}** with **${callerRep.points}** pts`
      : "";

    const container = infoContainer(
      `${emojis.reputation.leaderboard} Reputation leaderboard`,
      `${lines.join("\n")}${footerNote}`,
      {
        color: config.colors.gold,
        fields: [
          {
            name: `${emojis.ui.scroll} Page`,
            value: `${page + 1} of ${totalPages}  •  ${total} total members ranked`,
          },
        ],
      }
    );

    await interaction.editReply({ components: [container], flags: COMPONENTS_V2_FLAG });
  },
};

function buildBar(points) {
  // Visual bar capped at 20 points for display
  const filled = Math.min(Math.floor(points / 2), 10);
  return `[${"█".repeat(filled)}${"░".repeat(10 - filled)}]`;
}
