// src/commands/social-extra/anniversary.js
const { SlashCommandBuilder } = require("discord.js");
const Marriage = require("../../models/Marriage");
const emojis = require("../../emojis");
const config = require("../../config");
const { infoContainer, errorContainer, componentReply, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("anniversary")
    .setDescription("Check your marriage anniversary 💍")
    .addUserOption((o) => o.setName("user").setDescription("Check another user's anniversary (defaults to yourself)")),

  async execute(interaction) {
    const target = interaction.options.getUser("user") ?? interaction.user;
    const guildId = interaction.guildId;

    const marriage = await Marriage.findActiveMarriage(target.id, guildId);
    if (!marriage) {
      return componentReply(interaction,
        errorContainer(`${emojis.marriage.divorce} Not married`, `**${target.username}** is not currently married.`),
        { ephemeral: true }
      );
    }

    const partnerId = marriage.getPartner(target.id);
    let partner;
    try { partner = await interaction.client.users.fetch(partnerId); }
    catch { partner = { username: "Unknown" }; }

    const days  = marriage.getDuration();
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years  = Math.floor(days / 365);

    const marriedTs = Math.floor(marriage.marriedAt.getTime() / 1000);

    // Next milestone
    const milestones = [7, 30, 100, 365, 500, 1000];
    const nextMilestone = milestones.find((m) => m > days);
    const toNext = nextMilestone ? nextMilestone - days : null;

    const milestone = getMilestone(days);

    const fields = [
      { name: `${emojis.marriage.ring} Partner`, value: `**${partner.username}**` },
      { name: `${emojis.profile.calendar} Married on`, value: `<t:${marriedTs}:D>` },
      { name: `${emojis.ui.fire} Duration`, value: `**${days}** days (${weeks} weeks, ~${months} months${years > 0 ? `, ${years} year(s)` : ""})` },
      { name: `${emojis.ui.sparkles} Milestone`, value: milestone },
      ...(toNext ? [{ name: `${emojis.ui.star} Next milestone`, value: `**${toNext}** day(s) until day ${nextMilestone}!` }] : []),
      ...(marriage.proposalMessage ? [{ name: `${emojis.marriage.proposal} Proposal`, value: `> "${marriage.proposalMessage}"` }] : []),
    ];

    return interaction.reply({
      components: [infoContainer(
        `${emojis.marriage.anniversary} ${target.username}'s anniversary`,
        `Celebrating **${days}** day(s) together! ${emojis.marriage.heart}`,
        { color: config.colors.pink, fields, thumbnailUrl: target.displayAvatarURL({ dynamic: true }) }
      )],
      flags: COMPONENTS_V2_FLAG,
    });
  },
};

function getMilestone(days) {
  if (days >= 1000) return "💫 Legendary couple — 1000+ days together!";
  if (days >= 365)  return "🎉 One year anniversary! Incredible!";
  if (days >= 100)  return "🔥 100 day milestone! Still going strong!";
  if (days >= 30)   return "🌙 One month together!";
  if (days >= 7)    return "⭐ One week down!";
  return "🌱 Just getting started!";
}
