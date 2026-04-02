// src/commands/games/trivia.js
const { SlashCommandBuilder, ComponentType } = require("discord.js");
const GameScore = require("../../models/GameScore");
const Wallet    = require("../../models/Wallet");
const Transaction = require("../../models/Transaction");
const { checkAndUnlock } = require("../../utils/achievementHelper");
const config    = require("../../config");
const {
  infoContainer, successContainer, errorContainer,
  proposalContainer, componentReply, COMPONENTS_V2_FLAG,
  ButtonBuilder, ActionRowBuilder, ButtonStyle,
} = require("../../utils/embedBuilder");
const { ContainerBuilder, SectionBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize, ActionRowBuilder: ARB,
  ButtonBuilder: BB, ButtonStyle: BS } = require("discord.js");

const QUESTIONS = [
  { q: "In Naruto, what is the name of Naruto's signature jutsu?", a: "Rasengan", choices: ["Chidori","Rasengan","Amaterasu","Shinra Tensei"] },
  { q: "What anime features the Survey Corps fighting giants?", a: "Attack on Titan", choices: ["Demon Slayer","One Piece","Attack on Titan","Bleach"] },
  { q: "In Dragon Ball Z, what is the name of Goku's home planet?", a: "Planet Vegeta", choices: ["Namek","Earth","Planet Vegeta","Arlia"] },
  { q: "Which Pokémon is known as the 'Pikachu of the sea'?", a: "Marill", choices: ["Marill","Corsola","Wooper","Totodile"] },
  { q: "In One Piece, what fruit did Luffy eat?", a: "Gum-Gum Fruit", choices: ["Flame-Flame Fruit","Gum-Gum Fruit","Dark-Dark Fruit","Ice-Ice Fruit"] },
  { q: "What is the name of the organization in Fullmetal Alchemist: Brotherhood that seeks the Philosopher's Stone?", a: "Homunculi", choices: ["Akatsuki","Homunculi","Espada","Phantom Troupe"] },
  { q: "In Sword Art Online, what is the name of the first game?", a: "Sword Art Online", choices: ["ALfheim Online","Gun Gale Online","Sword Art Online","Underworld"] },
  { q: "Which anime features a boy named Tanjiro hunting demons?", a: "Demon Slayer", choices: ["Jujutsu Kaisen","Demon Slayer","Tokyo Ghoul","Bleach"] },
  { q: "In My Hero Academia, what is Izuku Midoriya's hero name?", a: "Deku", choices: ["All Might","Deku","Shoto","Ground Zero"] },
  { q: "What is the power system in Hunter x Hunter called?", a: "Nen", choices: ["Chakra","Nen","Reiatsu","Haki"] },
  { q: "In Fairy Tail, what dragon slayer magic does Natsu use?", a: "Fire Dragon Slayer Magic", choices: ["Ice Dragon Slayer Magic","Fire Dragon Slayer Magic","Shadow Dragon Slayer Magic","Lightning Dragon Slayer Magic"] },
  { q: "Which anime is set in the virtual world of Aincrad?", a: "Sword Art Online", choices: ["Log Horizon","No Game No Life","Sword Art Online",".hack//Sign"] },
  { q: "In Bleach, what is the name of Ichigo's sword?", a: "Zangetsu", choices: ["Senbonzakura","Zangetsu","Ryūjin Jakka","Wabisuke"] },
  { q: "What is Gojo Satoru's eye technique in Jujutsu Kaisen?", a: "Infinity", choices: ["Sharingan","Byakugan","Infinity","Rinnegan"] },
  { q: "In Death Note, what is the name of the Shinigami who drops the notebook?", a: "Ryuk", choices: ["Rem","Ryuk","Gelus","Sidoh"] },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("trivia")
    .setDescription("Answer an anime/gaming trivia question for coins 🧠"),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId  = interaction.user.id;

    const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    const shuffled = [...q.choices].sort(() => Math.random() - 0.5);

    // Build answer buttons
    const container = new ContainerBuilder().setAccentColor(config.colors.purple);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## 🧠 Trivia!\n${q.q}`)
    );
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addActionRowComponents(
      new ARB().addComponents(
        ...shuffled.slice(0, 2).map((c) =>
          new BB().setCustomId(`trivia:${c === q.a ? "correct" : "wrong"}:${userId}`).setLabel(c).setStyle(BS.Primary)
        )
      )
    );
    if (shuffled.length > 2) {
      container.addActionRowComponents(
        new ARB().addComponents(
          ...shuffled.slice(2).map((c) =>
            new BB().setCustomId(`trivia:${c === q.a ? "correct" : "wrong"}:${userId}`).setLabel(c).setStyle(BS.Primary)
          )
        )
      );
    }

    await interaction.reply({ components: [container], flags: COMPONENTS_V2_FLAG });

    const reply = await interaction.fetchReply();
    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === userId,
      time: 20_000,
      max: 1,
    });

    collector.on("collect", async (i) => {
      const correct = i.customId.startsWith("trivia:correct");
      const reward  = correct ? 25 : 0;

      const [scores, wallet] = await Promise.all([
        GameScore.findOrCreate(userId, guildId),
        Wallet.findOrCreate(userId, guildId),
      ]);

      if (correct) {
        scores.trivia.wins++;
        scores.trivia.streak++;
        wallet.addCoins(reward);
        await wallet.save();
        await Transaction.log({ guildId, fromUserId: userId, toUserId: null, amount: reward, type: "gamble", note: "Trivia win" });
      } else {
        scores.trivia.losses++;
        scores.trivia.streak = 0;
      }
      await scores.save();

      const result = correct
        ? successContainer("🧠 Correct!", `✅ **${q.a}** was right!\n\n+**${reward}** ${config.economy.currencyEmoji} • Balance: **${wallet.coins.toLocaleString()}** coins`)
        : errorContainer("🧠 Wrong!", `❌ The answer was **${q.a}**. Better luck next time!`);

      await i.update({ components: [result], flags: COMPONENTS_V2_FLAG });

      // Achievement checks
      if (correct) {
        const toCheck = [];
        if (scores.trivia.wins >= 1)  toCheck.push("trivia_first");
        if (scores.trivia.wins >= 10) toCheck.push("trivia_10");
        if (scores.trivia.wins >= 50) toCheck.push("trivia_50");
        await checkAndUnlock(i, userId, guildId, toCheck);
      }
    });

    collector.on("end", async (collected) => {
      if (collected.size === 0) {
        await interaction.editReply({
          components: [errorContainer("⏰ Too slow!", `The answer was **${q.a}**. You had 20 seconds!`)],
          flags: COMPONENTS_V2_FLAG,
        });
      }
    });
  },
};
