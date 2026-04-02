// src/commands/social/familytree.js
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

async function resolveUsername(client, userId) {
  try {
    const u = await client.users.fetch(userId);
    return u.username;
  } catch {
    return "Unknown";
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("familytree")
    .setDescription("View your full family tree 🌳")
    .addUserOption((o) =>
      o.setName("user").setDescription("View another user's tree (defaults to yourself)")
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const target = interaction.options.getUser("user") ?? interaction.user;
    const guildId = interaction.guildId;
    const client = interaction.client;

    // Build the tree: grandparent → parent → target → children → grandchildren
    const lines = [];

    // ── Grandparent / Parent ──────────────────────────────────────────────────
    const parentRel = await Family.getParent(target.id, guildId);
    if (parentRel) {
      const grandparentRel = await Family.getParent(parentRel.parentId, guildId);
      if (grandparentRel) {
        const gpName = await resolveUsername(client, grandparentRel.parentId);
        lines.push(`${emojis.family.tree} **${gpName}** *(grandparent)*`);
        lines.push(`  └─ `);
      }
      const parentName = await resolveUsername(client, parentRel.parentId);
      const pLabel = parentRel.relationshipType === "owned" ? "owner" : "parent";
      lines.push(`${emojis.family.parent} **${parentName}** *(${pLabel})*`);
      lines.push(`  └─ `);
    }

    // ── Target + Spouse ───────────────────────────────────────────────────────
    const marriage = await Marriage.findActiveMarriage(target.id, guildId);
    let targetLine = `${emojis.profile.crown} **${target.username}** *(you)*`;
    if (marriage) {
      const partnerId = marriage.getPartner(target.id);
      const partnerName = await resolveUsername(client, partnerId);
      targetLine += `  ${emojis.marriage.ring} **${partnerName}** *(spouse)*`;
    }
    lines.push(targetLine);

    // ── Children ──────────────────────────────────────────────────────────────
    const children = await Family.getChildren(target.id, guildId);
    if (children.length === 0) {
      lines.push(`  └─ ${emojis.family.baby} No children`);
    } else {
      for (let i = 0; i < children.length; i++) {
        const isLast = i === children.length - 1;
        const childRel = children[i];
        const childName = await resolveUsername(client, childRel.childId);
        const cLabel = childRel.relationshipType === "owned" ? "owned" : "child";
        const prefix = isLast ? "  └─" : "  ├─";
        lines.push(`${prefix} ${emojis.family.child} **${childName}** *(${cLabel})*`);

        // Grandchildren
        const grandchildren = await Family.getChildren(childRel.childId, guildId);
        for (let j = 0; j < grandchildren.length; j++) {
          const gc = grandchildren[j];
          const gcName = await resolveUsername(client, gc.childId);
          const gcPrefix = isLast ? "       └─" : "  │    └─";
          lines.push(`${gcPrefix} ${emojis.family.baby} **${gcName}** *(grandchild)*`);
        }
      }
    }

    if (lines.length === 0) {
      return interaction.editReply({
        components: [errorContainer("No family", `**${target.username}** has no family connections yet.`)],
        flags: COMPONENTS_V2_FLAG,
      });
    }

    const container = infoContainer(
      `${emojis.family.tree} ${target.username}'s family tree`,
      lines.join("\n"),
      {
        color: config.colors.primary,
        thumbnailUrl: target.displayAvatarURL({ dynamic: true }),
      }
    );

    await interaction.editReply({ components: [container], flags: COMPONENTS_V2_FLAG });
  },
};
