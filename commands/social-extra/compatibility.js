// src/commands/social-extra/compatibility.js
const { SlashCommandBuilder } = require("discord.js");
const emojis = require("../../emojis");
const config = require("../../config");
const { infoContainer, componentReply, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

const TRAITS = [
  "Adventurous", "Caring", "Creative", "Loyal", "Honest",
  "Funny", "Ambitious", "Calm", "Passionate", "Mysterious",
];

const COMBOS = {
  high:   ["A cosmic connection 🌌", "Two souls, one heartbeat 💞", "Made for each other ✨", "The universe approves 🌟"],
  mid:    ["Solid chemistry 🔬", "You complement each other well 🧩", "Good vibes between you two 😎", "Worth exploring 🗺️"],
  low:    ["Polar opposites 🧲", "Friction, but maybe that's exciting? ⚡", "You'd have to work for it 💪", "Stranger things have worked out 🤷"],
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("compatibility")
    .setDescription("Check personality compatibility between two users 🔮")
    .addUserOption((o) => o.setName("user1").setDescription("First user").setRequired(true))
    .addUserOption((o) => o.setName("user2").setDescription("Second user (defaults to you)").setRequired(false)),

  async execute(interaction) {
    const user1 = interaction.options.getUser("user1");
    const user2 = interaction.options.getUser("user2") ?? interaction.user;

    // Deterministic trait assignment based on userId
    const getTrait = (id) => TRAITS[parseInt(id.slice(-4), 16) % TRAITS.length];
    const trait1 = getTrait(user1.id);
    const trait2 = getTrait(user2.id);

    // Score: combine both IDs for deterministic result
    const combined = [...`${user1.id}${user2.id}`].reduce((a, c) => a + c.charCodeAt(0), 0);
    const score = 20 + (combined % 81); // 20–100

    const tier  = score >= 70 ? "high" : score >= 45 ? "mid" : "low";
    const quote = COMBOS[tier][combined % COMBOS[tier].length];
    const bar   = `[${"█".repeat(Math.round(score / 10))}${"░".repeat(10 - Math.round(score / 10))}]`;

    const fields = [
      { name: `${emojis.profile.user} ${user1.username}'s trait`, value: `**${trait1}**` },
      { name: `${emojis.profile.user} ${user2.username}'s trait`, value: `**${trait2}**` },
      { name: "🔮 Compatibility", value: `${bar} **${score}%**` },
      { name: `${emojis.ui.sparkles} Reading`, value: quote },
    ];

    return interaction.reply({
      components: [infoContainer(
        `🔮 Compatibility check`,
        `How well do **${user1.username}** and **${user2.username}** match?`,
        { color: config.colors.purple, fields }
      )],
      flags: COMPONENTS_V2_FLAG,
    });
  },
};
