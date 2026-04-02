// src/commands/relationship/forgiveme.js
const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { successContainer, errorContainer, componentReply, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

const APOLOGY_GIFS = [
  "https://media.tenor.com/1y_hVenBnTUAAAAC/sorry-cute.gif",
  "https://media.tenor.com/ZkIUkD5TpdQAAAAC/forgive-me.gif",
  "https://media.tenor.com/sorrygif.gif",
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("forgiveme")
    .setDescription("Send a heartfelt apology to someone 🙏")
    .addUserOption((o) => o.setName("user").setDescription("Who to apologise to").setRequired(true))
    .addStringOption((o) =>
      o.setName("message").setDescription("Your apology message").setRequired(true).setMaxLength(200)
    ),

  async execute(interaction) {
    const target  = interaction.options.getUser("user");
    const message = interaction.options.getString("message");

    if (target.id === interaction.user.id) {
      return componentReply(interaction,
        errorContainer("Hmm!", "Self-forgiveness is valid, but this command is for apologising to others 🙏"),
        { ephemeral: true }
      );
    }
    if (target.bot) {
      return componentReply(interaction,
        errorContainer("Nope!", "Bots have no feelings to hurt."),
        { ephemeral: true }
      );
    }

    return interaction.reply({
      components: [successContainer(
        `🙏 ${interaction.user.username} is sorry`,
        `${target} — **${interaction.user.username}** has something to say:\n\n> 💌 *"${message}"*\n\n-# Sometimes sorry is the hardest word. It matters that they said it. 💕`,
        { thumbnailUrl: interaction.user.displayAvatarURL({ dynamic: true }) }
      )],
      flags: COMPONENTS_V2_FLAG,
    });
  },
};
