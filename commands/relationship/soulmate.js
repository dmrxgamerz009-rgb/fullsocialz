// src/commands/relationship/soulmate.js
const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { infoContainer, errorContainer, componentReply, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("soulmate")
    .setDescription("Find your soulmate in this server 🔮"),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId  = interaction.user.id;

    // Fetch server members for a random pick seeded by userId
    const guild = interaction.guild;
    if (!guild) {
      return componentReply(interaction, errorContainer("Error", "This command only works in servers."), { ephemeral: true });
    }

    await guild.members.fetch();
    const members = guild.members.cache
      .filter((m) => !m.user.bot && m.user.id !== userId)
      .map((m) => m.user);

    if (members.length === 0) {
      return componentReply(interaction,
        errorContainer("No one here!", "There aren't enough members to find your soulmate. Invite more people!"),
        { ephemeral: true }
      );
    }

    // Deterministic per-user so it's consistent
    const seed      = parseInt(userId.slice(-6), 16);
    const soulmate  = members[seed % members.length];

    const compatibility = 75 + (seed % 26); // 75–100 so it's always high
    const bar = `[${"❤️".repeat(Math.round(compatibility / 10))}${"🖤".repeat(10 - Math.round(compatibility / 10))}]`;

    const READINGS = [
      "The universe has aligned your paths for a reason. 🌌",
      "Two souls that were separated at birth — until now. ✨",
      "When you first spoke, the stars took note. 🌟",
      "Your energies are in perfect harmony. 💫",
      "Destined to find each other, even across the internet. 🔮",
    ];
    const reading = READINGS[seed % READINGS.length];

    const fields = [
      { name: "💞 Your soulmate", value: `**${soulmate.username}**` },
      { name: "❤️ Soul compatibility", value: `${bar} **${compatibility}%**` },
      { name: "🔮 The stars say", value: reading },
    ];

    return interaction.reply({
      components: [infoContainer(
        `🔮 ${interaction.user.username}'s soulmate`,
        "The cosmos have spoken...",
        { color: config.colors.purple, fields, thumbnailUrl: soulmate.displayAvatarURL({ dynamic: true }) }
      )],
      flags: COMPONENTS_V2_FLAG,
    });
  },
};
