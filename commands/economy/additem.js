// src/commands/economy/additem.js
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
    .setName("additem")
    .setDescription("Add a custom item to the shop ✨ (Admin only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) =>
      o.setName("id").setDescription("Unique item ID (no spaces, e.g. vip_pass)").setRequired(true).setMaxLength(30)
    )
    .addStringOption((o) =>
      o.setName("name").setDescription("Display name").setRequired(true).setMaxLength(50)
    )
    .addIntegerOption((o) =>
      o.setName("price").setDescription("Cost in coins").setRequired(true).setMinValue(0)
    )
    .addIntegerOption((o) =>
      o.setName("stock").setDescription("Stock amount (how many can be sold total)").setRequired(true).setMinValue(1)
    )
    .addStringOption((o) =>
      o.setName("description").setDescription("Item description").setMaxLength(150)
    )
    .addStringOption((o) =>
      o.setName("emoji").setDescription("Item emoji (e.g. 🎮)").setMaxLength(10)
    )
    .addIntegerOption((o) =>
      o.setName("max_per_user").setDescription("Max one person can own (-1 = unlimited)").setMinValue(1).setMaxValue(99)
    )
    .addRoleOption((o) =>
      o.setName("role").setDescription("Discord role to grant on purchase")
    ),

  async execute(interaction) {
    const guildId    = interaction.guildId;
    const rawId      = interaction.options.getString("id");
    const itemId     = rawId.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const name       = interaction.options.getString("name");
    const price      = interaction.options.getInteger("price");
    const stock      = interaction.options.getInteger("stock");
    const description = interaction.options.getString("description") ?? "A custom shop item.";
    const emoji      = interaction.options.getString("emoji") ?? "🎁";
    const maxPerUser = interaction.options.getInteger("max_per_user") ?? -1;
    const role       = interaction.options.getRole("role");

    if (!itemId) {
      return componentReply(interaction,
        errorContainer("Invalid ID", "Item ID can only contain letters, numbers, and underscores."),
        { ephemeral: true }
      );
    }

    // Check for duplicate
    const existing = await ShopItem.findOne({ guildId, itemId });
    if (existing) {
      return componentReply(interaction,
        errorContainer("ID already exists", `An item with ID \`${itemId}\` already exists in the shop. Use \`/edititem\` to modify it.`),
        { ephemeral: true }
      );
    }

    await ShopItem.create({
      guildId,
      itemId,
      name,
      description,
      emoji,
      price,
      stock,
      maxPerUser,
      roleId:    role?.id ?? null,
      active:    true,
      custom:    true,
      createdBy: interaction.user.id,
    });

    const lines = [
      `${emoji} **${name}** (\`${itemId}\`)`,
      `💰 Price: **${price}** ${config.economy.currencyEmoji}`,
      `📦 Stock: **${stock}**`,
      `👤 Max per user: **${maxPerUser === -1 ? "unlimited" : maxPerUser}**`,
      `📝 Description: ${description}`,
      ...(role ? [`🎭 Grants role: **${role.name}**`] : []),
    ];

    return componentReply(interaction,
      successContainer(
        "✨ Custom item added!",
        `New item added to the shop:\n\n${lines.join("\n")}\n\n-# Users can buy it with \`/buy ${itemId}\``
      )
    );
  },
};
