// src/commands/social/disown.js
const { SlashCommandBuilder, ComponentType } = require("discord.js");
const Family = require("../../models/Family");
const emojis = require("../../emojis");
const {
  proposalContainer,
  successContainer,
  errorContainer,
  infoContainer,
  componentReply,
  COMPONENTS_V2_FLAG,
} = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("disown")
    .setDescription("Disown one of your children 🚪")
    .addUserOption((o) =>
      o.setName("user").setDescription("The child to disown").setRequired(true)
    ),

  async execute(interaction) {
    const parent = interaction.user;
    const child = interaction.options.getUser("user");
    const guildId = interaction.guildId;

    const relationship = await Family.findOne({
      parentId: parent.id,
      childId: child.id,
      guildId,
      active: true,
    });

    if (!relationship) {
      return componentReply(
        interaction,
        errorContainer("Not your child", `**${child.username}** is not your child in this server.`),
        { ephemeral: true }
      );
    }

    const confirmId = `disown:confirm:${parent.id}:${child.id}`;
    const cancelId = `disown:cancel:${parent.id}:${child.id}`;

    const confirmMsg = proposalContainer(
      `${emojis.family.disown} Disown ${child.username}?`,
      `Are you sure you want to disown **${child.username}**?\n\nThis will remove them from your family. This cannot be undone.`,
      confirmId,
      cancelId
    );

    await interaction.reply({ components: [confirmMsg], flags: COMPONENTS_V2_FLAG });

    const reply = await interaction.fetchReply();
    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === parent.id,
      time: 30_000,
      max: 1,
    });

    collector.on("collect", async (i) => {
      if (i.customId === confirmId) {
        relationship.active = false;
        relationship.disownedAt = new Date();
        relationship.disownedBy = parent.id;
        await relationship.save();

        const doneMsg = successContainer(
          `${emojis.family.disown} Disowned`,
          `**${child.username}** has been removed from your family. ${emojis.marriage.divorce}`
        );
        await i.update({ components: [doneMsg], flags: COMPONENTS_V2_FLAG });
      } else {
        await i.update({
          components: [successContainer("Cancelled", `**${child.username}** is still your child. ${emojis.family.parent}`)],
          flags: COMPONENTS_V2_FLAG,
        });
      }
    });

    collector.on("end", async (collected) => {
      if (collected.size === 0) {
        await interaction.editReply({
          components: [errorContainer("Timed out", "Disown request expired.")],
          flags: COMPONENTS_V2_FLAG,
        });
      }
    });
  },
};
