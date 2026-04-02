// src/commands/social-extra/confession.js
const { SlashCommandBuilder } = require("discord.js");
const emojis = require("../../emojis");
const config = require("../../config");
const { successContainer, errorContainer, infoContainer, componentReply, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("confession")
    .setDescription("Send an anonymous confession to someone 💌")
    .addUserOption((o) => o.setName("user").setDescription("Who to confess to").setRequired(true))
    .addStringOption((o) => o.setName("message").setDescription("Your confession").setRequired(true).setMaxLength(300)),

  async execute(interaction) {
    const target  = interaction.options.getUser("user");
    const message = interaction.options.getString("message");

    if (target.id === interaction.user.id)
      return componentReply(interaction, errorContainer("Hmm!", "You can't confess to yourself!"), { ephemeral: true });
    if (target.bot)
      return componentReply(interaction, errorContainer("Nope!", "Bots can't receive confessions."), { ephemeral: true });

    // Try to DM the target with the confession
    const confessionContainer = infoContainer(
      `${emojis.marriage.heart} Anonymous confession`,
      `Someone in **${interaction.guild?.name ?? "a server"}** has something to tell you:\n\n> 💌 *"${message}"*\n\n-# The sender's identity is hidden.`,
      { color: config.colors.pink }
    );

    try {
      await target.send({ components: [confessionContainer], flags: COMPONENTS_V2_FLAG });
    } catch {
      // DMs disabled — post in channel as anonymous
      await interaction.channel.send({
        components: [infoContainer(
          `${emojis.marriage.heart} Anonymous confession for ${target.username}`,
          `> 💌 *"${message}"*\n\n-# Sent anonymously.`,
          { color: config.colors.pink }
        )],
        flags: COMPONENTS_V2_FLAG,
      });
    }

    return componentReply(interaction,
      successContainer(`${emojis.marriage.heart} Confession sent!`, `Your anonymous confession has been delivered to **${target.username}**. 💌`),
      { ephemeral: true }
    );
  },
};
