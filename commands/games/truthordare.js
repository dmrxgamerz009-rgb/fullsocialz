// src/commands/games/truthordare.js
const { SlashCommandBuilder, ComponentType, ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../../config");
const { successContainer, errorContainer, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

const TRUTHS = [
  "What's the most embarrassing thing you've done online?",
  "Who in this server do you have a crush on? 👀",
  "What's your most unpopular opinion about anime?",
  "Have you ever pretended to be offline to avoid someone?",
  "What's the pettiest thing you've ever done?",
  "What's a secret talent nobody here knows about?",
  "Have you ever cried at an anime? Which one?",
  "What's the weirdest thing in your search history?",
  "Who do you think is the funniest person in this server?",
  "What's something you've lied about recently?",
  "What's your most controversial gaming opinion?",
  "Have you ever been banned from a server?",
  "What's your biggest red flag in relationships?",
  "What's one thing you'd change about this server?",
  "Who's your comfort character and why?",
];

const DARES = [
  "Send a voice message singing any song for 10 seconds",
  "Change your status to 'I love eating crayons' for 30 minutes",
  "Send a message entirely in capital letters for the next 5 minutes",
  "Write a 3-sentence fanfic about two random server members",
  "Tag someone random and tell them they're your hero",
  "Share the 5th photo in your camera roll right now",
  "Send a message only using the letter 'a' and spaces",
  "Do your best uwu impression in chat right now",
  "Tell us your honest rating of this server 1-10 and why",
  "React with 🍕 to every message sent in the next 2 minutes",
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("truthordare")
    .setDescription("Play Truth or Dare! 🎭")
    .addUserOption((o) =>
      o.setName("user").setDescription("Challenge someone (optional)")
    ),

  async execute(interaction) {
    const target = interaction.options.getUser("user");
    const who    = target ?? interaction.user;

    const container = new ContainerBuilder().setAccentColor(config.colors.purple);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## 🎭 Truth or Dare!\n${who}, pick your fate:`
      )
    );
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`tod:truth:${who.id}`)
          .setLabel("🕊️ Truth")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`tod:dare:${who.id}`)
          .setLabel("😈 Dare")
          .setStyle(ButtonStyle.Danger),
      )
    );

    await interaction.reply({ components: [container], flags: COMPONENTS_V2_FLAG });

    const reply = await interaction.fetchReply();
    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === who.id,
      time: 60_000,
      max: 1,
    });

    collector.on("collect", async (i) => {
      const isTruth = i.customId.startsWith("tod:truth");
      const pool    = isTruth ? TRUTHS : DARES;
      const picked  = pool[Math.floor(Math.random() * pool.length)];
      const emoji   = isTruth ? "🕊️" : "😈";
      const label   = isTruth ? "Truth" : "Dare";

      await i.update({
        components: [successContainer(
          `${emoji} ${label}!`,
          `**${who.username}** chose **${label}**!\n\n> ${picked}`
        )],
        flags: COMPONENTS_V2_FLAG,
      });
    });

    collector.on("end", async (collected) => {
      if (collected.size === 0) {
        await interaction.editReply({
          components: [errorContainer("Timed out", `**${who.username}** was too scared to choose! 💀`)],
          flags: COMPONENTS_V2_FLAG,
        });
      }
    });
  },
};
