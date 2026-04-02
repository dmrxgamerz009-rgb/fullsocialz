// src/commands/economy/gamble.js
const { SlashCommandBuilder } = require("discord.js");
const Wallet = require("../../models/Wallet");
const Transaction = require("../../models/Transaction");
const config = require("../../config");
const { successContainer, errorContainer, componentReply, formatTime, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gamble")
    .setDescription("Roll the dice and risk your coins 🎲")
    .addIntegerOption((o) =>
      o.setName("amount").setDescription(`Amount to bet (${config.economy?.gamble?.minBet ?? 10}–${config.economy?.gamble?.maxBet ?? 1000})`).setRequired(true)
        .setMinValue(config.economy?.gamble?.minBet ?? 10)
        .setMaxValue(config.economy?.gamble?.maxBet ?? 1000)
    ),

  async execute(interaction) {
    const bet     = interaction.options.getInteger("amount");
    const guildId = interaction.guildId;
    const userId  = interaction.user.id;
    const cfg     = config.economy.gamble;

    const wallet = await Wallet.findOrCreate(userId, guildId);

    // Cooldown
    const cdKey = `gamble:${userId}`;
    const lastGambleField = wallet.get ? wallet.lastWork : null; // reuse lastWork as proxy — store separately via a generic field
    // We'll use a simple in-memory approach with Wallet's updatedAt as a proxy
    // For a production bot add a lastGamble field to Wallet schema
    if (wallet.coins < bet) {
      return componentReply(interaction,
        errorContainer("Can't afford it!", `You need **${bet}** ${config.economy.currencyEmoji} but only have **${wallet.coins}**.`),
        { ephemeral: true }
      );
    }

    // Dice roll: player and house both roll 1–6
    const playerRoll = Math.floor(Math.random() * 6) + 1;
    const houseRoll  = Math.floor(Math.random() * 6) + 1;

    const DICE = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣"];
    const playerDie = DICE[playerRoll - 1];
    const houseDie  = DICE[houseRoll - 1];

    let result, delta;

    if (playerRoll > houseRoll) {
      delta  = bet;
      result = "win";
    } else if (playerRoll === houseRoll) {
      delta  = 0;
      result = "tie";
    } else {
      delta  = -bet;
      result = "lose";
    }

    wallet.addCoins(delta);
    await wallet.save();

    if (delta !== 0) {
      await Transaction.log({ guildId, fromUserId: userId, toUserId: null, amount: delta, type: "gamble" });
    }

    const outcomes = {
      win:  { title: "🎲 You won!", desc: `You rolled **${playerDie}** vs house **${houseDie}** — higher wins!\n\n+**${bet}** ${config.economy.currencyEmoji}\n**Balance: ${wallet.coins.toLocaleString()} coins**` },
      tie:  { title: "🎲 It's a tie!", desc: `Both rolled **${playerDie}** — no coins change hands.\n**Balance: ${wallet.coins.toLocaleString()} coins**` },
      lose: { title: "🎲 You lost!", desc: `You rolled **${playerDie}** vs house **${houseDie}** — house wins!\n\n-**${bet}** ${config.economy.currencyEmoji}\n**Balance: ${wallet.coins.toLocaleString()} coins**` },
    };

    const o = outcomes[result];
    const container = result === "win"
      ? successContainer(o.title, o.desc)
      : errorContainer(o.title, o.desc);

    return componentReply(interaction, container);
  },
};
