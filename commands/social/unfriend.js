// src/commands/social/unfriend.js
const { SlashCommandBuilder } = require("discord.js");
const User = require("../../models/User");
const emojis = require("../../emojis");
const {
  successContainer,
  errorContainer,
  componentReply,
} = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unfriend")
    .setDescription("Remove someone from your best friends list 💔")
    .addUserOption((o) =>
      o.setName("user").setDescription("The friend to remove").setRequired(true)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser("user");
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    const userData = await User.findOne({ userId, guildId });
    const bestFriends = userData?.bestFriends ?? [];

    if (!bestFriends.includes(target.id)) {
      return componentReply(
        interaction,
        errorContainer("Not in list", `**${target.username}** isn't in your best friends list.`),
        { ephemeral: true }
      );
    }

    await User.findOneAndUpdate(
      { userId, guildId },
      { $pull: { bestFriends: target.id } }
    );

    return componentReply(
      interaction,
      successContainer(
        `${emojis.marriage.divorce} Unfriended`,
        `**${target.username}** has been removed from your best friends. ${emojis.marriage.divorce}`
      )
    );
  },
};
