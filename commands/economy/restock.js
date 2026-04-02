// src/commands/economy/restock.js
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const ShopItem = require("../../models/ShopItem");
const config = require("../../config");
const {
  successContainer,
  errorContainer,
  componentReply,
  COMPONENTS_V2_FLAG,
} = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("restock")
    .setDescription("Add stock to a custom shop item 📦 (Admin only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) =>
      o.setName("id").setDescription("Item ID to restock").setRequired(true)
    )
    .addIntegerOption((o) =>
      o.setName("amount").setDescription("How much stock to add").setRequired(true).setMinValue(1).setMaxValue(9999)
    ),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const itemId  = interaction.options.getString("id").toLowerCase().trim();
    const amount  = interaction.options.getInteger("amount");

    const shopItem = await ShopItem.findOne({ guildId, itemId });
    if (!shopItem) {
      return componentReply(interaction,
        errorContainer("Not found", `No item with ID \`${itemId}\` found.`),
        { ephemeral: true }
      );
    }

    if (!shopItem.custom) {
      return componentReply(interaction,
        errorContainer("Can't restock", `**${shopItem.name}** is a default system item with unlimited stock.`),
        { ephemeral: true }
      );
    }

    const oldStock  = shopItem.stock;
    shopItem.stock  = Math.max(0, oldStock) + amount;
    // If item was deactivated due to 0 stock, re-activate it
    if (!shopItem.active) {
      shopItem.active = true;
    }
    await shopItem.save();

    return componentReply(interaction,
      successContainer(
        `📦 Restocked!`,
        [
          `${shopItem.emoji} **${shopItem.name}** has been restocked!`,
          ``,
          `📦 Previous stock: **${oldStock <= 0 ? "0 (sold out)" : oldStock}**`,
          `📦 Added: **+${amount}**`,
          `📦 New stock: **${shopItem.stock}**`,
          ``,
          `-# Item is now ${shopItem.active ? "visible" : "hidden"} in the shop.`,
        ].join("\n")
      )
    );
  },
};
