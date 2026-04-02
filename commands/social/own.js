// src/commands/social/own.js
const { SlashCommandBuilder, ComponentType } = require("discord.js");
const Family = require("../../models/Family");
const emojis = require("../../emojis");
const config = require("../../config");
const {
  proposalContainer, successContainer, errorContainer,
  componentReply, COMPONENTS_V2_FLAG,
} = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("own")
    .setDescription("Claim someone as yours 🤝")
    .addUserOption((o) => o.setName("user").setDescription("The person you want to claim").setRequired(true))
    .addStringOption((o) => o.setName("message").setDescription("A message to send with your claim (optional)").setMaxLength(150)),

  async execute(interaction) {
    const owner = interaction.user;
    const target = interaction.options.getUser("user");
    const message = interaction.options.getString("message") ?? "You belong to me now!";
    const guildId = interaction.guildId;

    if (target.id === owner.id)
      return componentReply(interaction, errorContainer("Nope!", "You can't claim yourself!"), { ephemeral: true });
    if (target.bot)
      return componentReply(interaction, errorContainer("Nope!", "Bots can't be owned."), { ephemeral: true });

    const existingOwner = await Family.findOne({ childId: target.id, guildId, relationshipType: "owned", active: true });
    if (existingOwner)
      return componentReply(interaction, errorContainer("Already owned!", `**${target.username}** is already owned by someone.`), { ephemeral: true });

    const owned = await Family.find({ parentId: owner.id, guildId, relationshipType: "owned", active: true });
    if (owned.length >= config.social.adoption.maxChildren)
      return componentReply(interaction, errorContainer("Too many!", `You can only own up to **${config.social.adoption.maxChildren}** people.`), { ephemeral: true });

    const acceptId = `own:accept:${owner.id}:${target.id}`;
    const declineId = `own:decline:${owner.id}:${target.id}`;

    const proposalMsg = proposalContainer(
      `${emojis.family.own} Ownership request`,
      `${target} — **${owner.username}** wants to claim you!\n\n> ${emojis.ui.gem} *"${message}"*\n\nDo you accept?`,
      acceptId, declineId,
      owner.displayAvatarURL({ dynamic: true })
    );

    await interaction.reply({ components: [proposalMsg], flags: COMPONENTS_V2_FLAG });

    const reply = await interaction.fetchReply();
    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === target.id,
      time: config.social.adoption.requestTimeout,
      max: 1,
    });

    collector.on("collect", async (i) => {
      if (i.customId === acceptId) {
        await Family.create({ guildId, parentId: owner.id, childId: target.id, relationshipType: "owned", initiatedBy: owner.id, message, active: true });
        await i.update({
          components: [successContainer(`${emojis.family.own} Claimed!`, `**${target.username}** now belongs to **${owner.username}**! ${emojis.ui.gem}`, { thumbnailUrl: target.displayAvatarURL({ dynamic: true }) })],
          flags: COMPONENTS_V2_FLAG,
        });
      } else {
        await i.update({ components: [errorContainer("Declined", `**${target.username}** rejected the claim.`)], flags: COMPONENTS_V2_FLAG });
      }
    });

    collector.on("end", async (collected) => {
      if (collected.size === 0)
        await interaction.editReply({ components: [errorContainer("Timed out", "Ownership request expired.")], flags: COMPONENTS_V2_FLAG });
    });
  },
};