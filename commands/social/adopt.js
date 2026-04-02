// src/commands/social/adopt.js
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
    .setName("adopt")
    .setDescription("Adopt someone into your family 🏠")
    .addUserOption((o) => o.setName("user").setDescription("The person you want to adopt").setRequired(true))
    .addStringOption((o) => o.setName("message").setDescription("A warm welcome message (optional)").setMaxLength(150)),

  async execute(interaction) {
    const parent = interaction.user;
    const child = interaction.options.getUser("user");
    const message = interaction.options.getString("message") ?? "Welcome to the family!";
    const guildId = interaction.guildId;

    if (child.id === parent.id)
      return componentReply(interaction, errorContainer("Nope!", "You can't adopt yourself!"), { ephemeral: true });
    if (child.bot)
      return componentReply(interaction, errorContainer("Nope!", "Bots can't be adopted."), { ephemeral: true });

    const existingParent = await Family.getParent(child.id, guildId);
    if (existingParent)
      return componentReply(interaction, errorContainer("Already has a parent!", `**${child.username}** already has a parent in this server.`), { ephemeral: true });

    const children = await Family.getChildren(parent.id, guildId);
    if (children.length >= config.social.adoption.maxChildren)
      return componentReply(interaction, errorContainer("Too many children!", `You can only have up to **${config.social.adoption.maxChildren}** children.`), { ephemeral: true });

    const grandchildren = await Family.getChildren(child.id, guildId);
    if (grandchildren.find((c) => c.childId === parent.id))
      return componentReply(interaction, errorContainer("Circular family!", "That would create a circular family relationship!"), { ephemeral: true });

    const acceptId = `adopt:accept:${parent.id}:${child.id}`;
    const declineId = `adopt:decline:${parent.id}:${child.id}`;

    const proposalMsg = proposalContainer(
      `${emojis.family.adopt} Adoption request`,
      `${child} — **${parent.username}** wants to adopt you!\n\n> ${emojis.family.baby} *"${message}"*\n\nDo you accept?`,
      acceptId, declineId,
      parent.displayAvatarURL({ dynamic: true })
    );

    await interaction.reply({ components: [proposalMsg], flags: COMPONENTS_V2_FLAG });

    const reply = await interaction.fetchReply();
    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === child.id,
      time: config.social.adoption.requestTimeout,
      max: 1,
    });

    collector.on("collect", async (i) => {
      if (i.customId === acceptId) {
        await Family.create({ guildId, parentId: parent.id, childId: child.id, relationshipType: "adopted", initiatedBy: parent.id, message, active: true });
        await i.update({
          components: [successContainer(`${emojis.family.parent} Adoption complete!`, `**${child.username}** is now the child of **${parent.username}**! ${emojis.family.baby}`, { thumbnailUrl: child.displayAvatarURL({ dynamic: true }) })],
          flags: COMPONENTS_V2_FLAG,
        });
      } else {
        await i.update({ components: [errorContainer(`${emojis.family.disown} Adoption declined`, `**${child.username}** declined.`)], flags: COMPONENTS_V2_FLAG });
      }
    });

    collector.on("end", async (collected) => {
      if (collected.size === 0)
        await interaction.editReply({ components: [errorContainer("Timed out", "The adoption request expired.")], flags: COMPONENTS_V2_FLAG });
    });
  },
};