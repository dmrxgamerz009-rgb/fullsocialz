// src/commands/social/profile.js
const { SlashCommandBuilder } = require("discord.js");
const User = require("../../models/User");
const Marriage = require("../../models/Marriage");
const Family = require("../../models/Family");
const Reputation = require("../../models/Reputation");
const emojis = require("../../emojis");
const config = require("../../config");
const {
  infoContainer,
  successContainer,
  errorContainer,
  componentReply,
  COMPONENTS_V2_FLAG,
} = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View or update a social profile")
    .addSubcommand((sub) =>
      sub
        .setName("view")
        .setDescription("View someone's profile")
        .addUserOption((o) => o.setName("user").setDescription("User to view (defaults to yourself)"))
    )
    .addSubcommand((sub) =>
      sub
        .setName("setbio")
        .setDescription("Set your profile bio")
        .addStringOption((o) =>
          o.setName("bio").setDescription("Your new bio").setRequired(true).setMaxLength(200)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (sub === "setbio") {
      const bio = interaction.options.getString("bio");
      await User.findOneAndUpdate(
        { userId: interaction.user.id, guildId },
        { bio, username: interaction.user.username },
        { upsert: true, new: true }
      );
      return componentReply(
        interaction,
        successContainer(`${emojis.profile.bio} Bio updated!`, `Your bio is now:\n> ${bio}`),
        { ephemeral: true }
      );
    }

    // ── View profile ──────────────────────────────────────────────────────────
    const target = interaction.options.getUser("user") ?? interaction.user;

    const [userData, marriage, familySnap, repData, achDoc] = await Promise.all([
      User.findOrCreate(target.id, guildId, { username: target.username }),
      Marriage.findActiveMarriage(target.id, guildId),
      Family.getFamilySnapshot(target.id, guildId),
      Reputation.findOrCreate(target.id, guildId),
      Achievement.findOrCreate(target.id, guildId),
    ]);

    // Build partner display
    let spouseDisplay = `${emojis.marriage.divorce} Single`;
    if (marriage) {
      const partnerId = marriage.getPartner(target.id);
      try {
        const partner = await interaction.client.users.fetch(partnerId);
        spouseDisplay = `${emojis.marriage.ring} ${partner.username} (${marriage.getDuration()}d)`;
      } catch {
        spouseDisplay = `${emojis.marriage.ring} Unknown`;
      }
    }

    // Build family display
    const parentDisplay = familySnap.parent
      ? `Has a parent`
      : `${emojis.family.tree} None`;

    const childCount = familySnap.children.length;

    const fields = [
      { name: `${emojis.profile.bio} Bio`, value: userData.bio },
      { name: `${emojis.marriage.ring} Spouse`, value: spouseDisplay },
      {
        name: `${emojis.family.parent} Family`,
        value: `${familySnap.parent ? `${emojis.family.child} Has parent` : "No parent"} • ${emojis.family.baby} ${childCount} child(ren)`,
      },
      {
        name: `${emojis.reputation.rep} Reputation`,
        value: `⭐ ${repData.points} points • ${repData.repsReceived} reps received`,
      },
      ...(achDoc.activeTitle ? [{ name: "👑 Title", value: achDoc.activeTitle }] : []),
      {
        name: `${emojis.anime.hug} Interactions`,
        value: `Hugs: ${userData.social.hugsReceived} • Pats: ${userData.social.patsReceived} • Kisses: ${userData.social.kissesReceived}`,
      },
    ];

    const profileContainer = infoContainer(
      `${emojis.profile.user} ${target.username}'s profile`,
      `*${target.username} has been in this server since <t:${Math.floor(userData.joinedAt / 1000)}:R>*`,
      {
        color: config.colors.pink,
        fields,
        thumbnailUrl: target.displayAvatarURL({ dynamic: true }),
      }
    );

    await interaction.reply({ components: [profileContainer], flags: COMPONENTS_V2_FLAG });
  },
};
