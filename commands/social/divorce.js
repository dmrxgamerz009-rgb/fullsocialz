// src/commands/social/divorce.js
const { SlashCommandBuilder, ComponentType } = require("discord.js");
const Marriage = require("../../models/Marriage");
const emojis = require("../../emojis");
const config = require("../../config");
const {
  proposalContainer,
  successContainer,
  errorContainer,
  componentReply,
  COMPONENTS_V2_FLAG,
} = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("divorce")
    .setDescription("End your marriage 💔"),

  async execute(interaction) {
    const user = interaction.user;
    const guildId = interaction.guildId;

    const marriage = await Marriage.findActiveMarriage(user.id, guildId);
    if (!marriage) {
      return componentReply(interaction, errorContainer("Not married", "You're not married to anyone right now."), { ephemeral: true });
    }

    const partnerId = marriage.getPartner(user.id);
    let partner;
    try {
      partner = await interaction.client.users.fetch(partnerId);
    } catch {
      partner = { username: "Unknown User", id: partnerId };
    }

    const days = marriage.getDuration();
    const acceptId = `divorce:confirm:${user.id}`;
    const declineId = `divorce:cancel:${user.id}`;

    const confirmMsg = proposalContainer(
      `${emojis.marriage.divorce} Are you sure?`,
      `You've been married to **${partner.username}** for **${days} day(s)**.\n\nThis cannot be undone. Do you really want to divorce?`,
      acceptId,
      declineId
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
      if (i.customId === acceptId) {
        marriage.active = false;
        marriage.divorcedAt = new Date();
        marriage.divorcedBy = user.id;
        await marriage.save();

        const doneMsg = successContainer(
          `${emojis.marriage.divorce} Divorced`,
          `You and **${partner.username}** are no longer married.\nYou were married for **${days} day(s)**. 💔`,
        );
        await i.update({ components: [doneMsg], flags: COMPONENTS_V2_FLAG });
      } else {
        const cancelMsg = successContainer("Cancelled", `Phew! Your marriage with **${partner.username}** is safe. ${emojis.marriage.heart}`);
        await i.update({ components: [cancelMsg], flags: COMPONENTS_V2_FLAG });
      }
    });

    collector.on("end", async (collected) => {
      if (collected.size === 0) {
        const timeoutMsg = errorContainer("Timed out", "Divorce request expired.");
        await interaction.editReply({ components: [timeoutMsg], flags: COMPONENTS_V2_FLAG });
      }
    });
  },
};
