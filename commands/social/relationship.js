// src/commands/social/relationship.js
const { SlashCommandBuilder } = require("discord.js");
const Marriage = require("../../models/Marriage");
const Family = require("../../models/Family");
const User = require("../../models/User");
const emojis = require("../../emojis");
const config = require("../../config");
const {
  infoContainer,
  componentReply,
  COMPONENTS_V2_FLAG,
} = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("relationship")
    .setDescription("Check the relationship between two users 🔍")
    .addUserOption((o) =>
      o.setName("user1").setDescription("First user (defaults to yourself)").setRequired(false)
    )
    .addUserOption((o) =>
      o.setName("user2").setDescription("Second user").setRequired(false)
    ),

  async execute(interaction) {
    const user1 = interaction.options.getUser("user1") ?? interaction.user;
    const user2 = interaction.options.getUser("user2");
    const guildId = interaction.guildId;

    if (!user2) {
      // Show user1's all relationships summary
      const [marriage, snap] = await Promise.all([
        Marriage.findActiveMarriage(user1.id, guildId),
        Family.getFamilySnapshot(user1.id, guildId),
      ]);

      const lines = [];
      if (marriage) {
        const pId = marriage.getPartner(user1.id);
        try {
          const p = await interaction.client.users.fetch(pId);
          lines.push(`${emojis.marriage.ring} **Married to** ${p.username} (${marriage.getDuration()}d)`);
        } catch { lines.push(`${emojis.marriage.ring} Married to Unknown`); }
      } else {
        lines.push(`${emojis.marriage.divorce} **Single**`);
      }

      if (snap.parent) {
        try {
          const p = await interaction.client.users.fetch(snap.parent.parentId);
          const t = snap.parent.relationshipType === "owned" ? "Owned by" : "Child of";
          lines.push(`${emojis.family.parent} **${t}** ${p.username}`);
        } catch { lines.push(`${emojis.family.parent} Has a parent`); }
      }

      if (snap.children.length > 0) {
        lines.push(`${emojis.family.baby} **${snap.children.length}** child(ren) / owned`);
      }

      return componentReply(
        interaction,
        infoContainer(`${emojis.profile.heart} ${user1.username}'s relationships`, lines.join("\n"), {
          color: config.colors.pink,
          thumbnailUrl: user1.displayAvatarURL({ dynamic: true }),
        })
      );
    }

    // ── Check relationship between user1 and user2 ────────────────────────────
    const relationships = [];

    // Are they married?
    const marriage = await Marriage.findOne({
      guildId,
      active: true,
      $or: [
        { partnerId1: user1.id, partnerId2: user2.id },
        { partnerId1: user2.id, partnerId2: user1.id },
      ],
    });
    if (marriage) {
      relationships.push(`${emojis.marriage.ring} **Married** — together for ${marriage.getDuration()} day(s)`);
    }

    // Parent–child?
    const parentChild = await Family.findOne({
      guildId,
      active: true,
      $or: [
        { parentId: user1.id, childId: user2.id },
        { parentId: user2.id, childId: user1.id },
      ],
    });
    if (parentChild) {
      const label =
        parentChild.relationshipType === "owned"
          ? parentChild.parentId === user1.id
            ? `${emojis.family.own} **${user1.username}** owns **${user2.username}**`
            : `${emojis.family.own} **${user2.username}** owns **${user1.username}**`
          : parentChild.parentId === user1.id
          ? `${emojis.family.parent} **${user1.username}** is the parent of **${user2.username}**`
          : `${emojis.family.parent} **${user2.username}** is the parent of **${user1.username}**`;
      relationships.push(label);
    }

    // Siblings (same parent)?
    const [p1, p2] = await Promise.all([
      Family.getParent(user1.id, guildId),
      Family.getParent(user2.id, guildId),
    ]);
    if (p1 && p2 && p1.parentId === p2.parentId) {
      relationships.push(`${emojis.family.sibling} **Siblings** — same parent`);
    }

    // Best friends?
    const u1Data = await User.findOne({ userId: user1.id, guildId });
    if (u1Data?.bestFriends?.includes(user2.id)) {
      relationships.push(`${emojis.profile.friends} **${user1.username}** has **${user2.username}** as a best friend`);
    }

    const summary =
      relationships.length > 0
        ? relationships.join("\n")
        : `${emojis.profile.user} No known relationship between these two.`;

    return componentReply(
      interaction,
      infoContainer(
        `${emojis.profile.heart} Relationship`,
        `**${user1.username}** & **${user2.username}**\n\n${summary}`,
        { color: config.colors.pink }
      )
    );
  },
};
