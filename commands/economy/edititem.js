// src/commands/economy/edititem.js
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
    .setName("edititem")
    .setDescription("Edit a custom shop item ✏️ (Admin only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) =>
      o.setName("id").setDescription("Item ID to edit").setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("name").setDescription("New display name").setMaxLength(50)
    )
    .addIntegerOption((o) =>
      o.setName("price").setDescription("New price in coins").setMinValue(0)
    )
    .addStringOption((o) =>
      o.setName("description").setDescription("New description").setMaxLength(150)
    )
    .addStringOption((o) =>
      o.setName("emoji").setDescription("New emoji").setMaxLength(10)
    )
    .addIntegerOption((o) =>
      o.setName("max_per_user").setDescription("New max per user (0 = unlimited)").setMinValue(0).setMaxValue(99)
    )
    .addBooleanOption((o) =>
      o.setName("active").setDescription("Show/hide item in shop")
    )
    .addRoleOption((o) =>
      o.setName("role").setDescription("New role to grant on purchase (use @everyone to clear)")
    ),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const itemId  = interaction.options.getString("id").toLowerCase().trim();

    const shopItem = await ShopItem.findOne({ guildId, itemId });
    if (!shopItem) {
      return componentReply(interaction,
        errorContainer("Not found", `No item with ID \`${itemId}\` found.`),
        { ephemeral: true }
      );
    }

    if (!shopItem.custom) {
      return componentReply(interaction,
        errorContainer("Can't edit", `**${shopItem.name}** is a default system item and cannot be edited.`),
        { ephemeral: true }
      );
    }

    // Apply each provided option
    const changes = [];

    const newName = interaction.options.getString("name");
    if (newName) { shopItem.name = newName; changes.push(`Name → **${newName}**`); }

    const newPrice = interaction.options.getInteger("price");
    if (newPrice !== null) { shopItem.price = newPrice; changes.push(`Price → **${newPrice}** ${config.economy.currencyEmoji}`); }

    const newDesc = interaction.options.getString("description");
    if (newDesc) { shopItem.description = newDesc; changes.push(`Description → *${newDesc}*`); }

    const newEmoji = interaction.options.getString("emoji");
    if (newEmoji) { shopItem.emoji = newEmoji; changes.push(`Emoji → ${newEmoji}`); }

    const newMax = interaction.options.getInteger("max_per_user");
    if (newMax !== null) {
      shopItem.maxPerUser = newMax === 0 ? -1 : newMax;
      changes.push(`Max per user → **${newMax === 0 ? "unlimited" : newMax}**`);
    }

    const newActive = interaction.options.getBoolean("active");
    if (newActive !== null) {
      shopItem.active = newActive;
      changes.push(`Status → **${newActive ? "visible" : "hidden"}**`);
    }

    const newRole = interaction.options.getRole("role");
    if (newRole) {
      // @everyone role ID = guildId — treat as clearing the role
      shopItem.roleId = newRole.id === guildId ? null : newRole.id;
      changes.push(`Role → **${newRole.id === guildId ? "none (cleared)" : newRole.name}**`);
    }

    if (changes.length === 0) {
      return componentReply(interaction,
        errorContainer("Nothing to change", "You didn't provide any fields to update."),
        { ephemeral: true }
      );
    }

    await shopItem.save();

    return componentReply(interaction,
      successContainer(
        `✏️ ${shopItem.emoji} ${shopItem.name} updated!`,
        `Changes made:\n${changes.map((c) => `• ${c}`).join("\n")}`
      )
    );
  },
};
