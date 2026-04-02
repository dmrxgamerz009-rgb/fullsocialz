// src/commands/social/siblings.js
const { SlashCommandBuilder } = require("discord.js");
const Family = require("../../models/Family");
const emojis = require("../../emojis");
const config = require("../../config");
const {
  infoContainer,
  errorContainer,
  componentReply,
  COMPONENTS_V2_FLAG,
} = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("siblings")
    .setDescription("See your siblings — people with the same parent as you 👫")
    .addUserOption((o) =>
      o.setName("user").setDescription("View another user's siblings (defaults to yourself)")
    ),

  async execute(interaction) {
    const target = interaction.options.getUser("user") ?? interaction.user;
    const guildId = interaction.guildId;

    // Find target's parent
    const parentRel = await Family.getParent(target.id, guildId);
    if (!parentRel) {
      return componentReply(
        interaction,
        errorContainer(`${emojis.family.sibling} No siblings`, `**${target.username}** has no parent, so no siblings either.`),
        { ephemeral: true }
      );
    }

    // Find all children of that parent
    const allChildren = await Family.getChildren(parentRel.parentId, guildId);
    const siblings = allChildren.filter((c) => c.childId !== target.id);

    if (siblings.length === 0) {
      return componentReply(
        interaction,
        errorContainer(`${emojis.family.sibling} No siblings`, `**${target.username}** is an only child.`),
        { ephemeral: true }
      );
    }

    let parentUser;
    try {
      parentUser = await interaction.client.users.fetch(parentRel.parentId);
    } catch {
      parentUser = { username: "Unknown" };
    }

    const siblingLines = await Promise.all(
      siblings.map(async (rel) => {
        try {
          const u = await interaction.client.users.fetch(rel.childId);
          return `${emojis.family.sibling} **${u.username}**`;
        } catch {
          return `${emojis.family.sibling} Unknown`;
        }
      })
    );

    const fields = [
      { name: `${emojis.family.parent} Shared parent`, value: `**${parentUser.username}**` },
      { name: `${emojis.family.sibling} Siblings (${siblings.length})`, value: siblingLines.join("\n") },
    ];

    const container = infoContainer(
      `${emojis.family.sibling} ${target.username}'s siblings`,
      `**${target.username}** has **${siblings.length}** sibling(s)!`,
      { color: config.colors.pink, fields, thumbnailUrl: target.displayAvatarURL({ dynamic: true }) }
    );

    await interaction.reply({ components: [container], flags: COMPONENTS_V2_FLAG });
  },
};
