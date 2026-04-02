// src/commands/economy/pay.js
const { SlashCommandBuilder } = require("discord.js");
const Wallet = require("../../models/Wallet");
const Transaction = require("../../models/Transaction");
const config = require("../../config");
const { successContainer, errorContainer, componentReply, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pay")
    .setDescription("Transfer coins to another user 💸")
    .addUserOption((o) => o.setName("user").setDescription("Who to pay").setRequired(true))
    .addIntegerOption((o) => o.setName("amount").setDescription("Amount to pay").setRequired(true).setMinValue(1)),

  async execute(interaction) {
    const target  = interaction.options.getUser("user");
    const amount  = interaction.options.getInteger("amount");
    const guildId = interaction.guildId;
    const userId  = interaction.user.id;

    if (target.id === userId)
      return componentReply(interaction, errorContainer("Nope!", "You can't pay yourself."), { ephemeral: true });
    if (target.bot)
      return componentReply(interaction, errorContainer("Nope!", "Bots don't accept payments."), { ephemeral: true });

    const senderWallet = await Wallet.findOrCreate(userId, guildId);

    if (senderWallet.coins < amount) {
      return componentReply(interaction,
        errorContainer("Insufficient coins",
          `You need **${amount}** ${config.economy.currencyEmoji} but only have **${senderWallet.coins}**.`),
        { ephemeral: true }
      );
    }

    const receiverWallet = await Wallet.findOrCreate(target.id, guildId);

    senderWallet.addCoins(-amount);
    receiverWallet.addCoins(amount);

    await Promise.all([senderWallet.save(), receiverWallet.save()]);
    await Transaction.log({ guildId, fromUserId: userId, toUserId: target.id, amount, type: "pay" });

    return interaction.reply({
      components: [successContainer(
        "💸 Payment sent!",
        `You sent **${amount}** ${config.economy.currencyEmoji} to **${target.username}**!\n\nYour balance: **${senderWallet.coins.toLocaleString()}** coins`,
        { thumbnailUrl: target.displayAvatarURL({ dynamic: true }) }
      )],
      flags: COMPONENTS_V2_FLAG,
    });
  },
};
