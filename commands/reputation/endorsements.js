// src/commands/reputation/endorsements.js
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
    .setName("endorsements")
    .setDescription("View all endorsements for a user 🏅")
    .addUserOption((o) =>
      o.setName("user").setDescription("User to view (defaults to yourself)")
    ),

  async execute(interaction) {
    const target = interaction.options.getUser("user") ?? interaction.user;
    const guildId = interaction.guildId;

    const repData = await Reputation.findOrCreate(target.id, guildId);

    if (repData.endorsements.length === 0) {
      return componentReply(
        interaction,
        errorContainer(
          `${emojis.reputation.endorse} No endorsements`,
          `**${target.username}** hasn't received any endorsements yet.\nUse \`/endorse\` to be the first!`
        )
      );
    }

    // Resolve endorsement authors
    const lines = await Promise.all(
      repData.endorsements.map(async (e, i) => {
        let fromName = "Unknown";
        try {
          const u = await interaction.client.users.fetch(e.fromUserId);
          fromName = u.username;
        } catch { /* left */ }

        const ts = Math.floor(new Date(e.createdAt).getTime() / 1000);
        return `${emojis.reputation.endorse} **${fromName}** • <t:${ts}:R>\n> *"${e.message}"*`;
      })
    );

    const container = infoContainer(
      `${emojis.reputation.endorse} ${target.username}'s endorsements`,
      lines.join("\n\n"),
      {
        color: config.colors.gold,
        fields: [
          {
            name: `${emojis.reputation.rep} Rep points`,
            value: `**${repData.points}** total`,
          },
        ],
        thumbnailUrl: target.displayAvatarURL({ dynamic: true }),
      }
    );

    return interaction.reply({ components: [container], flags: COMPONENTS_V2_FLAG });
  },
};
