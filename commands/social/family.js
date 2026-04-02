// src/commands/social/family.js
const { SlashCommandBuilder } = require("discord.js");
const Family = require("../../models/Family");
const Marriage = require("../../models/Marriage");
const emojis = require("../../emojis");
const config = require("../../config");
const {
  infoContainer,
  errorContainer,
  componentReply,
  COMPONENTS_V2_FLAG,
} = require("../../utils/embedBuilder");

module.exports = require("discord.js") && {
  data: new SlashCommandBuilder()
    .setName("family")
    .setDescription("View your family members 👨‍👩‍👧")
    .addUserOption((o) =>
      o.setName("user").setDescription("View another user's family (defaults to yourself)")
    ),

  async execute(interaction) {
    const target = interaction.options.getUser("user") ?? interaction.user;
    const guildId = interaction.guildId;

    const [snap, marriage] = await Promise.all([
      Family.getFamilySnapshot(target.id, guildId),
      Marriage.findActiveMarriage(target.id, guildId),
    ]);

    // Resolve parent
    let parentLine = `${emojis.family.tree} No parent`;
    if (snap.parent) {
      try {
        const parentUser = await interaction.client.users.fetch(snap.parent.parentId);
        const rel = snap.parent.relationshipType === "owned" ? "Owner" : "Parent";
        parentLine = `${emojis.family.parent} **${parentUser.username}** *(${rel})*`;
      } catch {
        parentLine = `${emojis.family.parent} Unknown`;
      }
    }

    // Resolve spouse
    let spouseLine = `${emojis.marriage.divorce} Single`;
    if (marriage) {
      const partnerId = marriage.getPartner(target.id);
      try {
        const partner = await interaction.client.users.fetch(partnerId);
        spouseLine = `${emojis.marriage.ring} **${partner.username}** *(${marriage.getDuration()}d married)*`;
      } catch {
        spouseLine = `${emojis.marriage.ring} Unknown`;
      }
    }

    // Resolve children
    let childrenLines = `${emojis.family.baby} No children`;
    if (snap.children.length > 0) {
      const resolved = await Promise.all(
        snap.children.map(async (rel) => {
          try {
            const u = await interaction.client.users.fetch(rel.childId);
            const tag = rel.relationshipType === "owned" ? "Owned" : "Child";
            return `${emojis.family.child} **${u.username}** *(${tag})*`;
          } catch {
            return `${emojis.family.child} Unknown`;
          }
        })
      );
      childrenLines = resolved.join("\n");
    }

    const fields = [
      { name: "Parent / Owner", value: parentLine },
      { name: "Spouse", value: spouseLine },
      { name: `Children (${snap.children.length})`, value: childrenLines },
    ];

    const container = infoContainer(
      `${emojis.family.tree} ${target.username}'s family`,
      `Here's **${target.username}'s** current family in this server.`,
      { color: config.colors.pink, fields, thumbnailUrl: target.displayAvatarURL({ dynamic: true }) }
    );

    await interaction.reply({ components: [container], flags: COMPONENTS_V2_FLAG });
  },
};
