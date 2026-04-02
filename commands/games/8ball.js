// src/commands/games/8ball.js
const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { infoContainer, componentReply, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

const RESPONSES = [
  { text: "It is certain! 🎱",            type: "positive" },
  { text: "Without a doubt! 🎱",          type: "positive" },
  { text: "Yes, definitely! 🎱",          type: "positive" },
  { text: "You may rely on it! 🎱",       type: "positive" },
  { text: "As I see it, yes! 🎱",         type: "positive" },
  { text: "Most likely! 🎱",              type: "positive" },
  { text: "Outlook good! 🎱",             type: "positive" },
  { text: "Signs point to yes! 🎱",       type: "positive" },
  { text: "Reply hazy, try again... 🎱",  type: "neutral"  },
  { text: "Ask again later! 🎱",          type: "neutral"  },
  { text: "Cannot predict now... 🎱",     type: "neutral"  },
  { text: "Concentrate and ask again 🎱", type: "neutral"  },
  { text: "Don't count on it! 🎱",        type: "negative" },
  { text: "My reply is no! 🎱",           type: "negative" },
  { text: "Very doubtful... 🎱",          type: "negative" },
  { text: "Outlook not so good! 🎱",      type: "negative" },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Ask the magic 8 ball a question 🎱")
    .addStringOption((o) => o.setName("question").setDescription("Your yes/no question").setRequired(true).setMaxLength(200)),

  async execute(interaction) {
    const question = interaction.options.getString("question");
    const response = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];
    const color = response.type === "positive" ? config.colors.success
                : response.type === "negative" ? config.colors.error
                : config.colors.neutral ?? 0x2f3136;

    return interaction.reply({
      components: [infoContainer(
        "🎱 Magic 8 Ball",
        `**You asked:** *${question}*\n\n**The ball says:** ${response.text}`,
        { color }
      )],
      flags: COMPONENTS_V2_FLAG,
    });
  },
};
