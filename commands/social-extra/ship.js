// src/commands/social-extra/ship.js
const { SlashCommandBuilder } = require("discord.js");
const Marriage = require("../../models/Marriage");
const emojis = require("../../emojis");
const config = require("../../config");
const { infoContainer, componentReply, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ship")
    .setDescription("Ship two people together 💘")
    .addUserOption((o) => o.setName("user1").setDescription("First person").setRequired(true))
    .addUserOption((o) => o.setName("user2").setDescription("Second person (defaults to you)").setRequired(false)),

  async execute(interaction) {
    const user1 = interaction.options.getUser("user1");
    const user2 = interaction.options.getUser("user2") ?? interaction.user;
    const guildId = interaction.guildId;

    if (user1.id === user2.id) {
      return componentReply(interaction,
        infoContainer("💘 Self-love!", `**${user1.username}** ships themselves. Bold.`, { color: config.colors.pink })
      );
    }

    // Deterministic score so the same pair always gets the same result
    const seed = [...`${user1.id}${user2.id}`].reduce((a, c) => a + c.charCodeAt(0), 0);
    let score = seed % 101; // 0–100

    // Bonus if actually married
    const married = await Marriage.findOne({
      guildId, active: true,
      $or: [
        { partnerId1: user1.id, partnerId2: user2.id },
        { partnerId1: user2.id, partnerId2: user1.id },
      ],
    });
    if (married) score = Math.min(100, score + 20);

    // Ship name: first half of user1 + second half of user2
    const n1 = user1.username, n2 = user2.username;
    const shipName = n1.slice(0, Math.ceil(n1.length / 2)) + n2.slice(Math.floor(n2.length / 2));

    const bar = buildBar(score);
    const verdict = getVerdict(score);

    const fields = [
      { name: "💘 Ship name", value: `**${shipName}**` },
      { name: `${emojis.marriage.heart} Compatibility`, value: `${bar} **${score}%**` },
      { name: `${emojis.ui.sparkles} Verdict`, value: verdict },
      ...(married ? [{ name: `${emojis.marriage.ring} Bonus`, value: "Already married! +20% compatibility 💍" }] : []),
    ];

    return interaction.reply({
      components: [infoContainer(
        `💘 Shipping ${user1.username} & ${user2.username}`,
        `Let's see how compatible **${user1.username}** and **${user2.username}** are...`,
        { color: config.colors.pink, fields }
      )],
      flags: COMPONENTS_V2_FLAG,
    });
  },
};

function buildBar(score) {
  const filled = Math.round(score / 10);
  return `[${"❤️".repeat(filled)}${"🖤".repeat(10 - filled)}]`;
}

function getVerdict(score) {
  if (score >= 90) return "A match made in heaven! 💫 Absolutely perfect.";
  if (score >= 75) return "Super compatible! They belong together. 💕";
  if (score >= 60) return "Pretty solid! Things could work out well. 😊";
  if (score >= 45) return "There's something there… give it a shot! 🤔";
  if (score >= 30) return "It's complicated. But love finds a way! 🌧️";
  if (score >= 15) return "A tough match… but opposites attract! 🌪️";
  return "Yikes. This might be a challenge. 💀";
}
