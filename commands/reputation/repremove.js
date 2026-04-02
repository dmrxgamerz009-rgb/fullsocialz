// src/commands/reputation/repremove.js
// Lets a user remove an endorsement they gave, or an admin wipe a rep record
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const Reputation = require("../../models/Reputation");
const emojis = require("../../emojis");
const {
  successContainer,
  errorContainer,
  componentReply,
  COMPONENTS_V2_FLAG,
} = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("repremove")
    .setDescription("Remove an endorsement you left for someone")
    .addUserOption((o) =>
      o.setName("user").setDescription("Who you endorsed").setRequired(true)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser("user");
    const guildId = interaction.guildId;
    const callerId = interaction.user.id;

    const repData = await Reputation.findOne({ userId: target.id, guildId });
    if (!repData || repData.endorsements.length === 0) {
      return componentReply(
        interaction,
        errorContainer("No endorsements", `**${target.username}** has no endorsements to remove.`),
        { ephemeral: true }
      );
    }

    // Find the caller's endorsement (most recent one)
    const isAdmin = interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild);
    const idx = isAdmin
      ? repData.endorsements.length - 1 // admins remove last endorsement
      : repData.endorsements.findLastIndex((e) => e.fromUserId === callerId);

    if (idx === -1) {
      return componentReply(
        interaction,
        errorContainer("Not found", `You haven't endorsed **${target.username}** yet.`),
        { ephemeral: true }
      );
    }

    const removed = repData.endorsements.splice(idx, 1)[0];

    // Deduct the bonus rep points
    repData.points = Math.max(0, repData.points - 2);
    await repData.save();

    return componentReply(
      interaction,
      successContainer(
        `${emojis.reputation.endorse} Endorsement removed`,
        `Removed the endorsement from **${target.username}**:\n> *"${removed.message}"*`
      ),
      { ephemeral: true }
    );
  },
};
