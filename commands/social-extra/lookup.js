// src/commands/social-extra/lookup.js
const { SlashCommandBuilder } = require("discord.js");
const User = require("../../models/User");
const Marriage = require("../../models/Marriage");
const Family = require("../../models/Family");
const Reputation = require("../../models/Reputation");
const Wallet = require("../../models/Wallet");
const SocialStatus = require("../../models/SocialStatus");
const emojis = require("../../emojis");
const config = require("../../config");
const { infoContainer, componentReply, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lookup")
    .setDescription("Full social profile snapshot of any user 🔍")
    .addUserOption((o) => o.setName("user").setDescription("User to look up (defaults to yourself)")),

  async execute(interaction) {
    await interaction.deferReply();
    const target = interaction.options.getUser("user") ?? interaction.user;
    const guildId = interaction.guildId;

    const [userData, marriage, snap, repData, wallet, statusDoc, achDoc] = await Promise.all([
      User.findOrCreate(target.id, guildId, { username: target.username }),
      Marriage.findActiveMarriage(target.id, guildId),
      Family.getFamilySnapshot(target.id, guildId),
      Reputation.findOrCreate(target.id, guildId),
      Wallet.findOrCreate(target.id, guildId),
      SocialStatus.findOne({ userId: target.id, guildId }),
      Achievement.findOrCreate(target.id, guildId),
    ]);

    // Spouse
    let spouseLine = `${emojis.marriage.divorce} Single`;
    if (marriage) {
      try {
        const p = await interaction.client.users.fetch(marriage.getPartner(target.id));
        spouseLine = `${emojis.marriage.ring} ${p.username} (${marriage.getDuration()}d)`;
      } catch { spouseLine = `${emojis.marriage.ring} Unknown`; }
    }

    // Status
    const statusLine = statusDoc?.status && !statusDoc.private
      ? `${statusDoc.mood} *"${statusDoc.status}"*`
      : "No public status";

    // Rep rank
    const repRank = (await Reputation.countDocuments({ guildId, points: { $gt: repData.points } })) + 1;

    const fields = [
      { name: `${emojis.profile.bio} Bio`, value: userData.bio },
      { name: "💬 Status", value: statusLine },
      { name: `${emojis.marriage.ring} Spouse`, value: spouseLine },
      { name: `${emojis.family.parent} Family`, value: `${snap.parent ? "Has parent" : "No parent"} • ${snap.children.length} child(ren)` },
      { name: `${emojis.reputation.rep} Reputation`, value: `**${repData.points}** pts — Rank #${repRank}` },
      { name: `${config.economy.currencyEmoji} Wallet`, value: `**${wallet.coins.toLocaleString()}** coins` },
      { name: `${emojis.anime.hug} Interactions`, value: `${userData.social?.interactionsTotal ?? 0} total` },
      ...(achDoc.activeTitle ? [{ name: '👑 Title', value: achDoc.activeTitle }] : []),
      { name: `${emojis.profile.calendar} Member since`, value: `<t:${Math.floor(userData.joinedAt / 1000)}:R>` },
    ];

    await interaction.editReply({
      components: [infoContainer(
        `${emojis.profile.user} ${target.username}'s full profile`,
        `A complete snapshot of **${target.username}** in this server.`,
        { color: config.colors.primary, fields, thumbnailUrl: target.displayAvatarURL({ dynamic: true }) }
      )],
      flags: COMPONENTS_V2_FLAG,
    });
  },
};
