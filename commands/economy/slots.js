// src/commands/economy/slots.js
const { SlashCommandBuilder } = require("discord.js");
const Wallet = require("../../models/Wallet");
const Transaction = require("../../models/Transaction");
const config = require("../../config");
const { successContainer, errorContainer, infoContainer, componentReply, formatTime, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

const SYMBOLS = ["🍒", "🍋", "🍊", "⭐", "💎", "🎰"];
const PAYOUTS = {
  "🍒🍒🍒": 2,
  "🍋🍋🍋": 3,
  "🍊🍊🍊": 4,
  "⭐⭐⭐": 6,
  "💎💎💎": 10,
  "🎰🎰🎰": 20,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("slots")
    .setDescription("Spin the slot machine 🎰")
    .addIntegerOption((o) =>
      o.setName("bet").setDescription("Amount to bet").setRequired(true)
        .setMinValue(config.economy?.slots?.minBet ?? 10)
        .setMaxValue(config.economy?.slots?.maxBet ?? 200)
    ),

  async execute(interaction) {
    const bet     = interaction.options.getInteger("bet");
    const guildId = interaction.guildId;
    const userId  = interaction.user.id;
    const cfg     = config.economy.slots;

    const wallet = await Wallet.findOrCreate(userId, guildId);

    // Cooldown via lastWork reuse — add proper lastSlots field for production
    if (wallet.coins < bet) {
      return componentReply(interaction,
        errorContainer("Can't afford it!", `You need **${bet}** ${config.economy.currencyEmoji} but only have **${wallet.coins}**.`),
        { ephemeral: true }
      );
    }

    // Spin
    const spin = [
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
    ];

    const key        = spin.join("");
    const multiplier = PAYOUTS[key] ?? (spin[0] === spin[1] || spin[1] === spin[2] ? 1.5 : 0);
    const winnings   = Math.floor(bet * multiplier);
    const delta      = winnings - bet;

    wallet.addCoins(delta);
    await wallet.save();

    if (delta !== 0) {
      await Transaction.log({ guildId, fromUserId: userId, toUserId: null, amount: delta, type: "slots" });
    }

    const slotDisplay = `[ ${spin[0]} | ${spin[1]} | ${spin[2]} ]`;

    if (multiplier === 0) {
      return componentReply(interaction,
        errorContainer(
          `🎰 No match!`,
          `${slotDisplay}\n\nBetter luck next time!\n\n-**${bet}** ${config.economy.currencyEmoji}\n**Balance: ${wallet.coins.toLocaleString()} coins**`
        )
      );
    }

    if (multiplier >= 10) {
      return componentReply(interaction,
        successContainer(
          `🎰 JACKPOT!! 🎉`,
          `${slotDisplay}\n\nTRIPLE ${spin[0]}! ${multiplier}× multiplier!\n\n+**${winnings}** ${config.economy.currencyEmoji}\n**Balance: ${wallet.coins.toLocaleString()} coins**`
        )
      );
    }

    return componentReply(interaction,
      successContainer(
        `🎰 Winner!`,
        `${slotDisplay}\n\n${multiplier}× multiplier!\n\n+**${winnings}** ${config.economy.currencyEmoji} (net: ${delta >= 0 ? "+" : ""}${delta})\n**Balance: ${wallet.coins.toLocaleString()} coins**`
      )
    );
  },
};
