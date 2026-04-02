// src/commands/games/guess.js
const { SlashCommandBuilder } = require("discord.js");
const Wallet      = require("../../models/Wallet");
const GameScore   = require("../../models/GameScore");
const Transaction = require("../../models/Transaction");
const config      = require("../../config");
const { successContainer, errorContainer, infoContainer, componentReply, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

// Store active games per user in memory (lightweight — no DB needed)
const activeGames = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("guess")
    .setDescription("Guess a number between 1–100 for coins 🎯")
    .addSubcommand((sub) => sub.setName("start").setDescription("Start a new guessing game"))
    .addSubcommand((sub) =>
      sub.setName("number")
        .setDescription("Submit your guess")
        .addIntegerOption((o) => o.setName("number").setDescription("Your guess (1–100)").setRequired(true).setMinValue(1).setMaxValue(100))
    ),

  async execute(interaction) {
    const sub     = interaction.options.getSubcommand();
    const userId  = interaction.user.id;
    const guildId = interaction.guildId;
    const gameKey = `${userId}:${guildId}`;

    if (sub === "start") {
      if (activeGames.has(gameKey)) {
        const game = activeGames.get(gameKey);
        return componentReply(interaction,
          infoContainer("🎯 Game in progress", `You already have a game running! You have **${game.attempts}** guesses left. Use \`/guess number\` to continue.`, { color: config.colors.primary }),
          { ephemeral: true }
        );
      }
      const target = Math.floor(Math.random() * 100) + 1;
      activeGames.set(gameKey, { target, attempts: 7, startedAt: Date.now() });

      return componentReply(interaction,
        infoContainer("🎯 Guessing game started!", "I'm thinking of a number between **1 and 100**.\n\nYou have **7 attempts**. Use `/guess number <your_guess>` to guess!\n\n**Reward:** 50 🪙 if you get it right!", { color: config.colors.primary })
      );
    }

    if (sub === "number") {
      const guess = interaction.options.getInteger("number");
      if (!activeGames.has(gameKey)) {
        return componentReply(interaction,
          errorContainer("No active game", "Start a game first with `/guess start`!"),
          { ephemeral: true }
        );
      }

      const game = activeGames.get(gameKey);
      game.attempts--;

      if (guess === game.target) {
        activeGames.delete(gameKey);
        const bonus = Math.max(10, game.attempts * 8);
        const wallet = await Wallet.findOrCreate(userId, guildId);
        wallet.addCoins(50 + bonus);
        await wallet.save();
        await Transaction.log({ guildId, fromUserId: userId, toUserId: null, amount: 50 + bonus, type: "gamble", note: "Guess win" });

        const scores = await GameScore.findOrCreate(userId, guildId);
        scores.guess.wins++;
        await scores.save();

        return componentReply(interaction,
          successContainer("🎯 Correct!", `✅ The number was **${game.target}**!\n\nBonus for guesses remaining: **+${bonus}** 🪙\nTotal: **+${50 + bonus}** ${config.economy.currencyEmoji}\n**Balance: ${wallet.coins.toLocaleString()} coins**`)
        );
      }

      if (game.attempts <= 0) {
        activeGames.delete(gameKey);
        const scores = await GameScore.findOrCreate(userId, guildId);
        scores.guess.losses++;
        await scores.save();
        return componentReply(interaction,
          errorContainer("🎯 Out of guesses!", `The number was **${game.target}**. Better luck next time!\nStart again with \`/guess start\`.`)
        );
      }

      const hint = guess < game.target ? "📈 Too low!" : "📉 Too high!";
      return componentReply(interaction,
        infoContainer("🎯 Keep going!", `**${guess}** — ${hint}\n\nAttempts left: **${game.attempts}**`, { color: config.colors.warning }),
        { ephemeral: false }
      );
    }
  },
};
