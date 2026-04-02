// src/commands/social-extra/gift.js
const { SlashCommandBuilder } = require("discord.js");
const Wallet = require("../../models/Wallet");
const Marriage = require("../../models/Marriage");
const Transaction = require("../../models/Transaction");
const emojis = require("../../emojis");
const config = require("../../config");
const { successContainer, errorContainer, componentReply, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("gift")
    .setDescription(`Send coins as a gift 🎁`)
    .addUserOption((o) => o.setName("user").setDescription("Who to gift").setRequired(true))
    .addIntegerOption((o) => o.setName("amount").setDescription("How many coins to send").setRequired(true).setMinValue(1))
    .addStringOption((o) => o.setName("message").setDescription("A gift message (optional)").setMaxLength(100)),

  async execute(interaction) {
    const target  = interaction.options.getUser("user");
    const amount  = interaction.options.getInteger("amount");
    const message = interaction.options.getString("message");
    const guildId = interaction.guildId;
    const userId  = interaction.user.id;

    if (target.id === userId)
      return componentReply(interaction, errorContainer("Nope!", "You can't gift yourself coins."), { ephemeral: true });
    if (target.bot)
      return componentReply(interaction, errorContainer("Nope!", "Bots don't use coins."), { ephemeral: true });

    const senderWallet = await Wallet.findOrCreate(userId, guildId);

    if (senderWallet.coins < amount) {
      return componentReply(interaction,
        errorContainer("Insufficient coins", `You only have **${senderWallet.coins}** ${config.economy.currencyEmoji}. You need **${amount}**.`),
        { ephemeral: true }
      );
    }

    // Marriage bonus — gifting your spouse costs 10% less
    const marriage = await Marriage.findOne({
      guildId, active: true,
      $or: [
        { partnerId1: userId, partnerId2: target.id },
        { partnerId1: target.id, partnerId2: userId },
      ],
    });

    const isSpouse = !!marriage;
    const actualAmount = isSpouse ? Math.ceil(amount * 0.9) : amount;
    const discount = amount - actualAmount;

    senderWallet.addCoins(-actualAmount);
    await senderWallet.save();

    const receiverWallet = await Wallet.findOrCreate(target.id, guildId);
    receiverWallet.addCoins(amount); // receiver always gets full amount
    await receiverWallet.save();

    await Transaction.log({ guildId, fromUserId: userId, toUserId: target.id, amount, type: "gift", note: message });

    const msgLine = message ? `\n\n> 💌 *"${message}"*` : "";
    const discountLine = isSpouse && discount > 0 ? `\n-# 💍 Spouse discount: you only paid **${actualAmount}** coins!` : "";

    return interaction.reply({
      components: [successContainer(
        `🎁 Gift sent!`,
        `You sent **${amount}** ${config.economy.currencyEmoji} to **${target.username}**!${msgLine}${discountLine}`,
        { thumbnailUrl: target.displayAvatarURL({ dynamic: true }) }
      )],
      flags: COMPONENTS_V2_FLAG,
    });
  },
};
