// src/commands/games/rps.js
const { SlashCommandBuilder, ComponentType, ContainerBuilder, SectionBuilder,
  TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize,
  ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const GameScore = require("../../models/GameScore");
const Wallet    = require("../../models/Wallet");
const Transaction = require("../../models/Transaction");
const { checkAndUnlock } = require("../../utils/achievementHelper");
const config = require("../../config");
const { successContainer, errorContainer, infoContainer, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

const CHOICES   = ["rock", "paper", "scissors"];
const EMOJI     = { rock: "✊", paper: "🖐️", scissors: "✌️" };
const BEATS     = { rock: "scissors", paper: "rock", scissors: "paper" };
const REWARD    = 15;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rps")
    .setDescription("Play Rock Paper Scissors against the bot ✊")
    .addUserOption((o) => o.setName("user").setDescription("Challenge another user (optional)")),

  async execute(interaction) {
    const guildId    = interaction.guildId;
    const userId     = interaction.user.id;
    const opponent   = interaction.options.getUser("user");

    if (opponent && opponent.id !== userId && !opponent.bot) {
      // PvP mode — show buttons to challenger first
      return pvpMode(interaction, userId, opponent, guildId);
    }

    // vs Bot mode
    const container = new ContainerBuilder().setAccentColor(config.colors.teal ?? 0x1D9E75);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ✊ Rock Paper Scissors!\nChoose your move:`)
    );
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`rps:rock:${userId}`).setLabel("✊ Rock").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`rps:paper:${userId}`).setLabel("🖐️ Paper").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`rps:scissors:${userId}`).setLabel("✌️ Scissors").setStyle(ButtonStyle.Primary),
      )
    );

    await interaction.reply({ components: [container], flags: COMPONENTS_V2_FLAG });

    const reply = await interaction.fetchReply();
    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === userId,
      time: 30_000,
      max: 1,
    });

    collector.on("collect", async (i) => {
      const player = i.customId.split(":")[1];
      const bot    = CHOICES[Math.floor(Math.random() * 3)];

      let outcome, delta;
      if (player === bot)                     { outcome = "tie";  delta = 0; }
      else if (BEATS[player] === bot)         { outcome = "win";  delta = REWARD; }
      else                                    { outcome = "lose"; delta = 0; }

      const scores = await GameScore.findOrCreate(userId, guildId);
      if (outcome === "win") {
        scores.rps.wins++;
        scores.rps.currentStreak++;
        scores.rps.bestStreak = Math.max(scores.rps.bestStreak, scores.rps.currentStreak);
      } else if (outcome === "lose") {
        scores.rps.losses++;
        scores.rps.currentStreak = 0;
      } else {
        scores.rps.ties++;
      }
      await scores.save();

      let resultContainer;
      if (outcome === "win") {
        const wallet = await Wallet.findOrCreate(userId, guildId);
        wallet.addCoins(delta);
        await wallet.save();
        await Transaction.log({ guildId, fromUserId: userId, toUserId: null, amount: delta, type: "gamble", note: "RPS win" });
        resultContainer = successContainer("✊ You win!", `${EMOJI[player]} vs ${EMOJI[bot]}\n\nYou won! +**${delta}** ${config.economy.currencyEmoji} • Streak: **${scores.rps.currentStreak}** 🔥`);
      } else if (outcome === "lose") {
        resultContainer = errorContainer("✊ You lost!", `${EMOJI[player]} vs ${EMOJI[bot]}\n\nBot wins this round!`);
      } else {
        resultContainer = infoContainer("✊ Tie!", `${EMOJI[player]} vs ${EMOJI[bot]}\n\nIt's a draw! Play again.`, { color: 0x5865f2 });
      }

      await i.update({ components: [resultContainer], flags: COMPONENTS_V2_FLAG });

      if (outcome === "win" && scores.rps.currentStreak >= 5) {
        await checkAndUnlock(i, userId, guildId, "rps_streak_5");
      }
    });

    collector.on("end", async (collected) => {
      if (collected.size === 0) {
        await interaction.editReply({
          components: [errorContainer("Timed out", "You didn't choose in time!")],
          flags: COMPONENTS_V2_FLAG,
        });
      }
    });
  },
};

async function pvpMode(interaction, challengerId, opponent, guildId) {
  const container = new ContainerBuilder().setAccentColor(0x1D9E75);
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## ✊ ${interaction.user.username} challenges ${opponent.username}!\n${opponent}, do you accept?`)
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`rps:accept:${challengerId}:${opponent.id}`).setLabel("Accept").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`rps:decline:${challengerId}:${opponent.id}`).setLabel("Decline").setStyle(ButtonStyle.Danger),
    )
  );

  await interaction.reply({ components: [container], flags: COMPONENTS_V2_FLAG });
  // Full PvP implementation left as a follow-up — this sets up the accept/decline flow
}
