// src/commands/social/marry.js
const { SlashCommandBuilder, ComponentType } = require("discord.js");
const Marriage = require("../../models/Marriage");
const User = require("../../models/User");
const emojis = require("../../emojis");
const config = require("../../config");
const {
  proposalContainer, successContainer, errorContainer,
  componentReply, COMPONENTS_V2_FLAG,
} = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("marry")
    .setDescription("Propose to someone and start your journey together 💍")
    .addUserOption((o) => o.setName("user").setDescription("The person you want to propose to").setRequired(true))
    .addStringOption((o) => o.setName("message").setDescription("A romantic proposal message (optional)").setMaxLength(200)),

  async execute(interaction) {
    const proposer = interaction.user;
    const target = interaction.options.getUser("user");
    const message = interaction.options.getString("message") ?? "Will you marry me?";
    const guildId = interaction.guildId;

    if (target.id === proposer.id)
      return componentReply(interaction, errorContainer("Hold on!", "You can't marry yourself, silly! 😅"), { ephemeral: true });
    if (target.bot)
      return componentReply(interaction, errorContainer("Nope!", "Bots don't have hearts to give. 🤖"), { ephemeral: true });

    const [proposerMarriage, targetMarriage] = await Promise.all([
      Marriage.findActiveMarriage(proposer.id, guildId),
      Marriage.findActiveMarriage(target.id, guildId),
    ]);

    if (proposerMarriage)
      return componentReply(interaction, errorContainer("Already taken!", `You're already married! Use ${emojis.marriage.divorce} \`/divorce\` first.`), { ephemeral: true });
    if (targetMarriage)
      return componentReply(interaction, errorContainer("Already taken!", `**${target.username}** is already married to someone else.`), { ephemeral: true });

    const acceptId = `marry:accept:${proposer.id}:${target.id}`;
    const declineId = `marry:decline:${proposer.id}:${target.id}`;

    const proposalMsg = proposalContainer(
      `${emojis.marriage.ring} A proposal!`,
      `${target} — **${proposer.username}** is getting down on one knee...\n\n> ${emojis.marriage.heart} *"${message}"*\n\nDo you accept?`,
      acceptId, declineId,
      proposer.displayAvatarURL({ dynamic: true })
    );

    // No content: field — not allowed with IS_COMPONENTS_V2
    await interaction.reply({ components: [proposalMsg], flags: COMPONENTS_V2_FLAG });

    const reply = await interaction.fetchReply();
    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === target.id,
      time: config.social.marriage.proposalTimeout,
      max: 1,
    });

    collector.on("collect", async (i) => {
      if (i.customId === acceptId) {
        await Marriage.create({
          guildId, partnerId1: proposer.id, partnerId2: target.id,
          proposerId: proposer.id, proposalMessage: message, active: true,
        });
        const successMsg = successContainer(
          `${emojis.marriage.married} Just married!`,
          `${proposer} & ${target} are now married! ${emojis.marriage.heart}\n\nWishing you a lifetime of happiness together. ${emojis.ui.sparkles}`,
          { thumbnailUrl: target.displayAvatarURL({ dynamic: true }) }
        );
        await i.update({ components: [successMsg], flags: COMPONENTS_V2_FLAG });
      } else {
        await i.update({
          components: [errorContainer(`${emojis.marriage.divorce} Proposal declined`, `**${target.username}** declined the proposal. 💔`)],
          flags: COMPONENTS_V2_FLAG,
        });
      }
    });

    collector.on("end", async (collected) => {
      if (collected.size === 0) {
        await interaction.editReply({
          components: [errorContainer("Proposal expired", `**${target.username}** didn't respond in time. ⏰`)],
          flags: COMPONENTS_V2_FLAG,
        });
      }
    });
  },
};