// src/commands/community/spotlight.js
const { SlashCommandBuilder } = require("discord.js");
const Achievement = require("../../models/Achievement");
const { checkAndUnlock } = require("../../utils/achievementHelper");
const config = require("../../config");
const { successContainer, errorContainer, componentReply, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("spotlight")
    .setDescription("Put a community member in the spotlight ✨")
    .addUserOption((o) => o.setName("user").setDescription("Who to spotlight").setRequired(true))
    .addStringOption((o) =>
      o.setName("reason").setDescription("Why are they in the spotlight?").setRequired(true).setMaxLength(200)
    ),

  async execute(interaction) {
    const target  = interaction.options.getUser("user");
    const reason  = interaction.options.getString("reason");
    const guildId = interaction.guildId;

    if (target.id === interaction.user.id) {
      return componentReply(interaction,
        errorContainer("Humble yourself!", "You can't spotlight yourself. Let others do that! 😄"),
        { ephemeral: true }
      );
    }
    if (target.bot) {
      return componentReply(interaction, errorContainer("Nope!", "Bots don't need spotlights."), { ephemeral: true });
    }

    await interaction.reply({
      components: [successContainer(
        `✨ Community spotlight!`,
        `🌟 **${target.username}** is in the spotlight!\n\n> *"${reason}"*\n\n— Nominated by **${interaction.user.username}** 💕`,
        { thumbnailUrl: target.displayAvatarURL({ dynamic: true }) }
      )],
      flags: COMPONENTS_V2_FLAG,
    });

    // Achievement for being spotlighted
    await checkAndUnlock(interaction, target.id, guildId, ["spotlighted"]);
  },
};
