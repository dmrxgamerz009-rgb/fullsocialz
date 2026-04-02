// src/commands/social/emancipate.js
const { SlashCommandBuilder, ComponentType } = require("discord.js");
const Family = require("../../models/Family");
const emojis = require("../../emojis");
const {
  proposalContainer,
  successContainer,
  errorContainer,
  componentReply,
  COMPONENTS_V2_FLAG,
} = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("emancipate")
    .setDescription("Free yourself from your parent or owner 🚪"),

  async execute(interaction) {
    const user = interaction.user;
    const guildId = interaction.guildId;

    const relationship = await Family.getParent(user.id, guildId);
    if (!relationship) {
      return componentReply(
        interaction,
        errorContainer("You're free!", "You don't have a parent or owner in this server."),
        { ephemeral: true }
      );
    }

    let parentUser;
    try {
      parentUser = await interaction.client.users.fetch(relationship.parentId);
    } catch {
      parentUser = { username: "Unknown User" };
    }

    const type = relationship.relationshipType === "owned" ? "owner" : "parent";
    const confirmId = `emancipate:confirm:${user.id}`;
    const cancelId = `emancipate:cancel:${user.id}`;

    const confirmMsg = proposalContainer(
      `${emojis.family.disown} Emancipate yourself?`,
      `Are you sure you want to leave **${parentUser.username}** as your ${type}?\n\nThis will remove the relationship permanently.`,
      confirmId,
      cancelId
    );

    await interaction.reply({ components: [confirmMsg], flags: COMPONENTS_V2_FLAG });

    const reply = await interaction.fetchReply();
    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === user.id,
      time: 30_000,
      max: 1,
    });

    collector.on("collect", async (i) => {
      if (i.customId === confirmId) {
        relationship.active = false;
        relationship.disownedAt = new Date();
        relationship.disownedBy = user.id;
        await relationship.save();

        const doneMsg = successContainer(
          `${emojis.family.disown} You're free!`,
          `You've successfully emancipated yourself from **${parentUser.username}**. ${emojis.ui.sparkles}`
        );
        await i.update({ components: [doneMsg], flags: COMPONENTS_V2_FLAG });
      } else {
        await i.update({
          components: [successContainer("Cancelled", `You're still with **${parentUser.username}**. ${emojis.family.parent}`)],
          flags: COMPONENTS_V2_FLAG,
        });
      }
    });

    collector.on("end", async (collected) => {
      if (collected.size === 0) {
        await interaction.editReply({
          components: [errorContainer("Timed out", "Emancipation request expired.")],
          flags: COMPONENTS_V2_FLAG,
        });
      }
    });
  },
};
