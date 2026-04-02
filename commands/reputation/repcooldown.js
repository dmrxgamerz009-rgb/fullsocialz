// src/commands/reputation/repcooldown.js
const { SlashCommandBuilder } = require("discord.js");
const Cooldown = require("../../models/Cooldown");
const emojis = require("../../emojis");
const config = require("../../config");
const {
  infoContainer,
  successContainer,
  componentReply,
  COMPONENTS_V2_FLAG,
} = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("repcooldown")
    .setDescription("Check your active reputation cooldowns ⏰"),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    // Fetch all rep/endorse cooldowns for this user in this guild
    const cooldowns = await Cooldown.find({
      userId,
      guildId,
      action: { $regex: /^(rep|endorse):/ },
      expiresAt: { $gt: new Date() },
    }).sort({ expiresAt: 1 });

    if (cooldowns.length === 0) {
      return componentReply(
        interaction,
        successContainer(
          `${emojis.reputation.cooldown} No active cooldowns`,
          "You're free to rep and endorse anyone right now! Go spread some love. 💕"
        ),
        { ephemeral: true }
      );
    }

    const lines = await Promise.all(
      cooldowns.map(async (cd) => {
        const [type, targetId] = cd.action.split(":");
        const remaining = Math.max(0, cd.expiresAt - Date.now());
        const formatted = Cooldown.formatTime(remaining);
        const expiresTs = Math.floor(cd.expiresAt.getTime() / 1000);

        let targetName = "Unknown";
        try {
          const u = await interaction.client.users.fetch(targetId);
          targetName = u.username;
        } catch { /* gone */ }

        const icon = type === "endorse" ? emojis.reputation.endorse : emojis.reputation.rep;
        return `${icon} **${type}** → **${targetName}** • resets <t:${expiresTs}:R> *(${formatted})*`;
      })
    );

    const container = infoContainer(
      `${emojis.reputation.cooldown} Your rep cooldowns`,
      lines.join("\n"),
      {
        color: config.colors.warning,
        fields: [
          {
            name: `${emojis.status.info} Info`,
            value: `Rep cooldown: **2 hours** per user\nEndorse cooldown: **24 hours** per user`,
          },
        ],
      }
    );

    return componentReply(interaction, container, { ephemeral: true });
  },
};
