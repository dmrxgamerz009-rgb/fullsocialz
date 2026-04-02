// src/commands/economy/coinflip.js
const { SlashCommandBuilder } = require("discord.js");
const Wallet = require("../../models/Wallet");
const Transaction = require("../../models/Transaction");
const config = require("../../config");
const { successContainer, errorContainer, componentReply } = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Flip a coin and bet on it 🪙")
    .addStringOption((o) =>
      o.setName("choice").setDescription("Heads or tails?").setRequired(true)
        .addChoices({ name: "Heads", value: "heads" }, { name: "Tails", value: "tails" })
    )
    .addIntegerOption((o) =>
      o.setName("amount").setDescription("Amount to bet").setRequired(true)
        .setMinValue(config.economy?.coinflip?.minBet ?? 5)
        .setMaxValue(config.economy?.coinflip?.maxBet ?? 500)
    ),

  async execute(interaction) {
    const choice  = interaction.options.getString("choice");
    const bet     = interaction.options.getInteger("amount");
    const guildId = interaction.guildId;
    const userId  = interaction.user.id;

    const wallet = await Wallet.findOrCreate(userId, guildId);

    if (wallet.coins < bet) {
      return componentReply(interaction,
        errorContainer("Can't afford it!", `You need **${bet}** ${config.economy.currencyEmoji} but only have **${wallet.coins}**.`),
        { ephemeral: true }
      );
    }

    const result = Math.random() < 0.5 ? "heads" : "tails";
    const won    = result === choice;
    const delta  = won ? bet : -bet;

    wallet.addCoins(delta);
    await wallet.save();

    await Transaction.log({ guildId, fromUserId: userId, toUserId: null, amount: delta, type: "coinflip" });

    const flip    = result === "heads" ? "🪙 Heads!" : "🔄 Tails!";
    const outcome = won ? "correct" : "wrong";

    if (won) {
      return componentReply(interaction,
        successContainer(
          `🪙 ${flip} You were ${outcome}!`,
          `You picked **${choice}** and it landed **${result}**!\n\n+**${bet}** ${config.economy.currencyEmoji}\n**Balance: ${wallet.coins.toLocaleString()} coins**`
        )
      );
    } else {
      return componentReply(interaction,
        errorContainer(
          `🪙 ${flip} You were ${outcome}!`,
          `You picked **${choice}** but it landed **${result}**!\n\n-**${bet}** ${config.economy.currencyEmoji}\n**Balance: ${wallet.coins.toLocaleString()} coins**`
        )
      );
    }
  },
};
