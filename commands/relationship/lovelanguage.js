// src/commands/relationship/lovelanguage.js
const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { infoContainer, componentReply, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

const LANGUAGES = [
  { name: "Words of Affirmation",   emoji: "💬", desc: "You express love through compliments, encouragement, and verbal appreciation. You light up when others recognise your efforts out loud." },
  { name: "Acts of Service",        emoji: "🛠️", desc: "You show love by doing things for others — helping out, anticipating needs, and going the extra mile. Actions mean more to you than words." },
  { name: "Receiving Gifts",        emoji: "🎁", desc: "Thoughtful tokens mean the world to you. It's not about the cost — it's knowing someone thought of you." },
  { name: "Quality Time",           emoji: "⏰", desc: "Undivided attention is your love language. You feel most valued when someone puts down distractions and just *is* with you." },
  { name: "Physical Touch",         emoji: "🤗", desc: "Warmth, closeness, and physical presence ground you. Hugs, pats on the back, and proximity matter deeply to you." },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lovelanguage")
    .setDescription("Discover your love language 💬")
    .addUserOption((o) => o.setName("user").setDescription("Check another user's love language")),

  async execute(interaction) {
    const target = interaction.options.getUser("user") ?? interaction.user;
    // Deterministic based on userId so it's always the same per person
    const idx  = parseInt(target.id.slice(-4), 16) % LANGUAGES.length;
    const lang = LANGUAGES[idx];

    return interaction.reply({
      components: [infoContainer(
        `${lang.emoji} ${target.username}'s love language`,
        `**${lang.name}**\n\n${lang.desc}`,
        { color: config.colors.pink, thumbnailUrl: target.displayAvatarURL({ dynamic: true }) }
      )],
      flags: COMPONENTS_V2_FLAG,
    });
  },
};
