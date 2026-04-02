// src/commands/reputation/endorse.js
const { SlashCommandBuilder } = require("discord.js");
const Reputation = require("../../models/Reputation");
const emojis = require("../../emojis");
const config = require("../../config");
const { checkCooldown, setCooldown, targetKey } = require("../../utils/cooldownManager");
const {
  successContainer,
  errorContainer,
  cooldownContainer,
  componentReply,
  COMPONENTS_V2_FLAG,
} = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("endorse")
    .setDescription("Write a public endorsement for someone 🏅")
    .addUserOption((o) =>
      o.setName("user").setDescription("Who to endorse").setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("message")
        .setDescription("Your endorsement message")
        .setRequired(true)
        .setMaxLength(config.reputation.maxEndorseLength)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser("user");
    const message = interaction.options.getString("message");
    const guildId = interaction.guildId;
    const giverId = interaction.user.id;

    if (target.id === giverId) {
      return componentReply(
        interaction,
        errorContainer("Hmm!", "You can't endorse yourself!"),
        { ephemeral: true }
      );
    }
    if (target.bot) {
      return componentReply(
        interaction,
        errorContainer("Nope!", "Bots don't need endorsements."),
        { ephemeral: true }
      );
    }

    // 24hr cooldown per target
    const cdKey = targetKey("endorse", target.id);
    const cd = await checkCooldown(giverId, guildId, cdKey);
    if (cd.onCooldown) {
      return componentReply(
        interaction,
        cooldownContainer("endorse", cd.remainingMs, target.username),
        { ephemeral: true }
      );
    }

    const targetRep = await Reputation.findOrCreate(target.id, guildId);

    // Cap endorsements at 10 per user (oldest replaced)
    if (targetRep.endorsements.length >= 10) {
      targetRep.endorsements.shift();
    }

    targetRep.endorsements.push({
      fromUserId: giverId,
      message,
    });

    // Endorsements also give extra rep points
    targetRep.points += config.reputation.pointsPerEndorse;
    await targetRep.save();

    await setCooldown(giverId, guildId, cdKey, config.reputation.cooldowns.endorse);

    const container = successContainer(
      `${emojis.reputation.endorse} Endorsement sent!`,
      `You endorsed **${target.username}**!\n\n> ${emojis.reputation.badge} *"${message}"*\n\nThey received **+${config.reputation.pointsPerEndorse}** bonus rep points!`,
      { thumbnailUrl: target.displayAvatarURL({ dynamic: true }) }
    );

    return interaction.reply({ components: [container], flags: COMPONENTS_V2_FLAG });
  },
};
