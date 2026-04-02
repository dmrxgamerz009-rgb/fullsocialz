// src/commands/relationship/promise.js
const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { successContainer, errorContainer, componentReply, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("promise")
    .setDescription("Make a public promise to someone 🤞")
    .addUserOption((o) => o.setName("user").setDescription("Who are you promising?").setRequired(true))
    .addStringOption((o) =>
      o.setName("promise").setDescription("What do you promise?").setRequired(true).setMaxLength(200)
    ),

  async execute(interaction) {
    const target  = interaction.options.getUser("user");
    const promise = interaction.options.getString("promise");

    if (target.id === interaction.user.id) {
      return componentReply(interaction,
        errorContainer("Hmm!", "You can't make a promise to yourself! Pick someone else."),
        { ephemeral: true }
      );
    }
    if (target.bot) {
      return componentReply(interaction,
        errorContainer("Nope!", "Bots can't hold you to your promises. 🤖"),
        { ephemeral: true }
      );
    }

    return interaction.reply({
      components: [successContainer(
        "🤞 Promise made!",
        `**${interaction.user.username}** makes a solemn promise to **${target.username}**:\n\n> 🤞 *"${promise}"*\n\n-# This promise has been witnessed by the server. 👀`,
        { thumbnailUrl: interaction.user.displayAvatarURL({ dynamic: true }) }
      )],
      flags: COMPONENTS_V2_FLAG,
    });
  },
};
