// src/commands/community/thankful.js
const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { successContainer, componentReply, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

const PROMPTS = [
  "Something that made you smile today",
  "A person in this server you're grateful for",
  "A small win you had recently",
  "Something you're looking forward to",
  "An anime that changed your perspective",
  "A moment this week that made you happy",
  "Something you love about this community",
  "A skill you're proud of",
  "A memory that still makes you smile",
  "Someone who supported you recently",
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("thankful")
    .setDescription("Share what you're thankful for with the server 🙏")
    .addStringOption((o) =>
      o.setName("message").setDescription("What are you thankful for?").setRequired(true).setMaxLength(200)
    ),

  async execute(interaction) {
    const message = interaction.options.getString("message");
    const prompt  = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];

    return interaction.reply({
      components: [successContainer(
        `🙏 ${interaction.user.username} is thankful`,
        `> *"${message}"*\n\n-# 💡 Next prompt: *${prompt}*`,
        { thumbnailUrl: interaction.user.displayAvatarURL({ dynamic: true }) }
      )],
      flags: COMPONENTS_V2_FLAG,
    });
  },
};
