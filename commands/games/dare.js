// src/commands/games/dare.js
const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { infoContainer, componentReply, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

const DARES = [
  "Send a voice message saying 'I am the greatest Discord user alive'",
  "Change your nickname to something embarrassing for the next hour",
  "Send a GIF that describes your personality right now",
  "Write a haiku about the last person who messaged you",
  "Type your next 3 messages with your eyes closed",
  "DM someone in this server a random compliment right now",
  "Describe yourself using only food emojis",
  "Send the most cursed image in your camera roll",
  "Tell everyone your most embarrassing Discord moment",
  "Speak only in questions for the next 5 minutes",
  "React to the last 5 messages in this channel with the most random emojis",
  "Write a love poem to your favourite anime character",
  "Admit something you've never told anyone in this server",
  "Do a terrible impression of another server member (with their permission!)",
  "Share the last song you listened to, no judgement",
  "Describe your day using only 3 emojis",
  "Say something nice about every person who's talked in chat today",
  "Send your current screen time stats",
  "Tell everyone your hot take on a popular anime",
  "Write the worst possible pun you can think of right now",
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dare")
    .setDescription("Get a random dare challenge 😈")
    .addUserOption((o) =>
      o.setName("user").setDescription("Dare a specific person (optional)")
    ),

  async execute(interaction) {
    const target = interaction.options.getUser("user");
    const dare   = DARES[Math.floor(Math.random() * DARES.length)];
    const who    = target ? `${target}` : `${interaction.user}`;
    const title  = target
      ? `😈 ${interaction.user.username} dares ${target.username}!`
      : "😈 Dare!";

    return interaction.reply({
      components: [infoContainer(
        title,
        `${who}, your dare is:\n\n> **${dare}**\n\n*Do you accept? 👀*`,
        { color: config.colors.error }
      )],
      flags: COMPONENTS_V2_FLAG,
    });
  },
};
