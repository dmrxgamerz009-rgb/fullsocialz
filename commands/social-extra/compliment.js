// src/commands/social-extra/compliment.js
const { SlashCommandBuilder } = require("discord.js");
const emojis = require("../../emojis");
const config = require("../../config");
const { successContainer, componentReply, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

const COMPLIMENTS = [
  "is one of the most genuine people in this server. 💖",
  "lights up every conversation they join. ✨",
  "has the kind of energy that makes everyone feel welcome. 🌟",
  "is seriously underrated. The world needs more people like them. 🙌",
  "has a heart of gold. Don't ever change. 💛",
  "makes this community a better place just by being here. 🌈",
  "is effortlessly cool and doesn't even know it. 😎",
  "brings such good vibes. Honestly a blessing. 🍀",
  "is the kind of person people are lucky to know. 💞",
  "has an amazing sense of humour and a kind soul. 😄",
  "is stronger than they think and kinder than they realize. 💪",
  "radiates good energy 24/7. An absolute gem. 💎",
  "deserves every good thing coming their way. 🎉",
  "is the type of person who makes others feel seen. 👀💗",
  "has a way of making any situation better. Total superstar. ⭐",
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("compliment")
    .setDescription("Send a heartfelt compliment to someone 💖")
    .addUserOption((o) => o.setName("user").setDescription("Who to compliment").setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser("user");
    const isSelf = target.id === interaction.user.id;

    const seed = Date.now() % COMPLIMENTS.length;
    const compliment = COMPLIMENTS[seed];

    const text = isSelf
      ? `**${target.username}** ${compliment}\n\n-# (Self-love counts too! 💕)`
      : `**${interaction.user.username}** says: **${target.username}** ${compliment}`;

    return interaction.reply({
      components: [successContainer(`${emojis.marriage.heart} Compliment!`, text, {
        thumbnailUrl: target.displayAvatarURL({ dynamic: true }),
      })],
      flags: COMPONENTS_V2_FLAG,
    });
  },
};
