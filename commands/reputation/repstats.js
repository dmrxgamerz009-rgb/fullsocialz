// src/commands/reputation/repstats.js
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

module.exports = {
  data: new SlashCommandBuilder()
    .setName("repstats")
    .setDescription("Detailed reputation statistics for a user 📊")
    .addUserOption((o) =>
      o.setName("user").setDescription("User to inspect (defaults to yourself)")
    ),

  async execute(interaction) {
    const target = interaction.options.getUser("user") ?? interaction.user;
    const guildId = interaction.guildId;

    const repData = await Reputation.findOrCreate(target.id, guildId);

    // Guild-wide totals for context
    const [totalMembers, totalReps] = await Promise.all([
      Reputation.countDocuments({ guildId }),
      Reputation.aggregate([
        { $match: { guildId } },
        { $group: { _id: null, total: { $sum: "$points" } } },
      ]),
    ]);

    const serverTotal = totalReps[0]?.total ?? 0;
    const sharePercent =
      serverTotal > 0 ? ((repData.points / serverTotal) * 100).toFixed(1) : "0.0";

    // Rank
    const rank =
      (await Reputation.countDocuments({ guildId, points: { $gt: repData.points } })) + 1;

    // Tier badge
    const tier = getTier(repData.points);

    const fields = [
      {
        name: `${emojis.reputation.badge} Tier`,
        value: `${tier.emoji} **${tier.name}**`,
      },
      {
        name: `${emojis.reputation.rep} Points`,
        value: `**${repData.points}** pts`,
      },
      {
        name: `${emojis.reputation.leaderboard} Server rank`,
        value: `**#${rank}** of ${totalMembers}`,
      },
      {
        name: `${emojis.reputation.upvote} Reps received`,
        value: `${repData.repsReceived}`,
      },
      {
        name: `${emojis.reputation.endorse} Endorsements`,
        value: `${repData.endorsements.length}`,
      },
      {
        name: `${emojis.ui.gem} Share of server rep`,
        value: `${sharePercent}% of all rep points`,
      },
      {
        name: `${emojis.reputation.rep} Reps given`,
        value: `${repData.repsGiven}`,
      },
    ];

    const container = infoContainer(
      `${emojis.reputation.leaderboard} ${target.username}'s rep stats`,
      `Full reputation breakdown for **${target.username}**.`,
      {
        color: config.colors.gold,
        fields,
        thumbnailUrl: target.displayAvatarURL({ dynamic: true }),
      }
    );

    return interaction.reply({ components: [container], flags: COMPONENTS_V2_FLAG });
  },
};

function getTier(points) {
  if (points >= 100) return { name: "Legendary", emoji: "🌟" };
  if (points >= 50)  return { name: "Diamond",   emoji: "💎" };
  if (points >= 25)  return { name: "Platinum",  emoji: "🔷" };
  if (points >= 10)  return { name: "Gold",      emoji: "🥇" };
  if (points >= 5)   return { name: "Silver",    emoji: "🥈" };
  if (points >= 1)   return { name: "Bronze",    emoji: "🥉" };
  return { name: "Unranked", emoji: "📭" };
}
