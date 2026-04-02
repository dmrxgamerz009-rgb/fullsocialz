// src/commands/reputation/reprank.js
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
    .setName("reprank")
    .setDescription("See your rank on the reputation leaderboard 🏅")
    .addUserOption((o) =>
      o.setName("user").setDescription("User to check (defaults to yourself)")
    ),

  async execute(interaction) {
    const target = interaction.options.getUser("user") ?? interaction.user;
    const guildId = interaction.guildId;

    const repData = await Reputation.findOne({ userId: target.id, guildId });

    if (!repData || repData.points === 0) {
      return componentReply(
        interaction,
        errorContainer(
          `${emojis.reputation.rep} Unranked`,
          `**${target.username}** hasn't earned any rep yet.\nUse \`/rep give @${target.username}\` to give them their first point!`
        )
      );
    }

    const [rank, total] = await Promise.all([
      Reputation.countDocuments({ guildId, points: { $gt: repData.points } }).then((n) => n + 1),
      Reputation.countDocuments({ guildId }),
    ]);

    // How many points to next rank
    const above = await Reputation.findOne({
      guildId,
      points: { $gt: repData.points },
    })
      .sort({ points: 1 })
      .lean();

    const toNext = above ? above.points - repData.points : 0;
    const tier = getTier(repData.points);
    const percentile = ((1 - (rank - 1) / total) * 100).toFixed(0);

    const fields = [
      { name: `${emojis.reputation.leaderboard} Rank`, value: `**#${rank}** out of ${total} members` },
      { name: `${emojis.reputation.rep} Points`, value: `**${repData.points}** pts` },
      { name: `${emojis.reputation.badge} Tier`, value: `${tier.emoji} **${tier.name}**` },
      { name: `${emojis.ui.fire} Percentile`, value: `Top **${percentile}%** of the server` },
      ...(toNext > 0
        ? [{ name: `${emojis.ui.star} To next rank`, value: `Need **${toNext}** more pts` }]
        : [{ name: `${emojis.profile.crown} Status`, value: "You're at the **top**! 🎉" }]),
    ];

    const container = infoContainer(
      `${emojis.reputation.leaderboard} ${target.username}'s rank`,
      `**${target.username}** is ranked **#${rank}** in this server.`,
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
