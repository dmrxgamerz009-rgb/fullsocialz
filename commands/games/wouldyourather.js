// src/commands/games/wouldyourather.js
const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { infoContainer, componentReply, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

const QUESTIONS = [
  ["Have the ability to fly", "Be invisible whenever you want"],
  ["Always be 10 minutes late", "Always be 20 minutes early"],
  ["Speak every language fluently", "Play every instrument perfectly"],
  ["Have unlimited money but no friends", "Have amazing friends but always be broke"],
  ["Live without music", "Live without social media"],
  ["Be able to talk to animals", "Know all languages"],
  ["Never age physically", "Never get sick"],
  ["Have a pause button for life", "Have a rewind button for life"],
  ["Be the funniest person in the room", "Be the smartest person in the room"],
  ["Fight 100 duck-sized horses", "Fight 1 horse-sized duck"],
  ["Only eat your favourite food forever", "Never eat it again"],
  ["Have super strength", "Have super speed"],
  ["Know how you'll die", "Know when you'll die"],
  ["Always have to whisper", "Always have to shout"],
  ["Live in a world with no internet", "Live in a world with no music"],
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("wouldyourather")
    .setDescription("Get a fun 'Would You Rather' question 🤔"),

  async execute(interaction) {
    const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];

    return interaction.reply({
      components: [infoContainer(
        "🤔 Would you rather...",
        `**Option A:** ${q[0]}\n\n**Option B:** ${q[1]}\n\n*Discuss in chat!*`,
        { color: config.colors.purple }
      )],
      flags: COMPONENTS_V2_FLAG,
    });
  },
};
