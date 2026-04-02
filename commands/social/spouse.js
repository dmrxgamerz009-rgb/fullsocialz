// src/commands/social/spouse.js
const { SlashCommandBuilder } = require("discord.js");
const Marriage = require("../../models/Marriage");
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
    .setName("spouse")
    .setDescription("View your current spouse 💕")
    .addUserOption((o) =>
      o.setName("user").setDescription("Check another user's spouse (defaults to yourself)")
    ),

  async execute(interaction) {
    const target = interaction.options.getUser("user") ?? interaction.user;
    const guildId = interaction.guildId;

    const marriage = await Marriage.findActiveMarriage(target.id, guildId);

    if (!marriage) {
      return componentReply(
        interaction,
        errorContainer(`${emojis.marriage.divorce} Single`, `**${target.username}** is not married to anyone.`),
        { ephemeral: !interaction.options.getUser("user") }
      );
    }

    const partnerId = marriage.getPartner(target.id);
    let partner;
    try {
      partner = await interaction.client.users.fetch(partnerId);
    } catch {
      partner = { username: "Unknown User", displayAvatarURL: () => null };
    }

    const days = marriage.getDuration();
    const marriedAt = Math.floor(marriage.marriedAt.getTime() / 1000);

    const fields = [
      { name: `${emojis.marriage.ring} Partner`, value: `**${partner.username}**` },
      { name: `${emojis.profile.calendar} Married on`, value: `<t:${marriedAt}:D>` },
      { name: `${emojis.ui.fire} Duration`, value: `**${days}** day(s) together` },
      ...(marriage.proposalMessage
        ? [{ name: `${emojis.marriage.proposal} Proposal message`, value: `> ${marriage.proposalMessage}` }]
        : []),
    ];

    const container = infoContainer(
      `${emojis.marriage.married} ${target.username}'s spouse`,
      `**${target.username}** is happily married to **${partner.username}**! ${emojis.marriage.heart}`,
      {
        color: config.colors.pink,
        fields,
        thumbnailUrl: partner.displayAvatarURL?.({ dynamic: true }) ?? null,
      }
    );

    await interaction.reply({ components: [container], flags: COMPONENTS_V2_FLAG });
  },
};
