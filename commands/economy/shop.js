// src/commands/economy/shop.js
const { SlashCommandBuilder } = require("discord.js");
const ShopItem = require("../../models/ShopItem");
const config = require("../../config");
const {
  infoContainer,
  errorContainer,
  componentReply,
  COMPONENTS_V2_FLAG,
} = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("Browse the server shop 🛒")
    .addStringOption((o) =>
      o.setName("category")
        .setDescription("Filter by category")
        .addChoices(
          { name: "All items", value: "all" },
          { name: "🎮 Default items", value: "default" },
          { name: "✨ Custom items", value: "custom" },
        )
    ),

  async execute(interaction) {
    const guildId  = interaction.guildId;
    const category = interaction.options.getString("category") ?? "all";

    // Seed defaults if shop is brand new
    await ShopItem.seedDefaults(guildId);

    // Build query
    const query = { guildId, active: true };
    if (category === "default") query.custom = false;
    if (category === "custom")  query.custom = true;

    const items = await ShopItem.find(query).sort({ custom: 1, price: 1 });

    if (items.length === 0) {
      return componentReply(interaction,
        errorContainer(
          "🛒 Nothing here",
          category === "custom"
            ? "No custom items yet! Admins can add them with `/additem`."
            : "The shop is empty right now."
        )
      );
    }

    // Split into two sections
    const defaultItems = items.filter((i) => !i.custom);
    const customItems  = items.filter((i) => i.custom);

    const formatItem = (item) => {
      const stockBadge = item.stock === -1
        ? "∞ unlimited"
        : item.stock === 0
          ? "❌ sold out"
          : `📦 ${item.stock} left`;

      const maxBadge    = item.maxPerUser > 0 ? ` • 👤 max ${item.maxPerUser}/person` : "";
      const roleBadge   = item.roleId ? " • 🎭 role" : "";
      const customBadge = item.custom ? " ✨" : "";

      return [
        `${item.emoji} **${item.name}**${customBadge} — ${config.economy.currencyEmoji} **${item.price}**`,
        `  ${item.description}`,
        `  -# ${stockBadge}${maxBadge}${roleBadge} • ID: \`${item.itemId}\``,
      ].join("\n");
    };

    const fields = [];

    if (defaultItems.length > 0 && (category === "all" || category === "default")) {
      fields.push({
        name: "🎮 Default items",
        value: defaultItems.map(formatItem).join("\n\n"),
      });
    }

    if (customItems.length > 0 && (category === "all" || category === "custom")) {
      fields.push({
        name: "✨ Custom items",
        value: customItems.map(formatItem).join("\n\n"),
      });
    }

    return interaction.reply({
      components: [infoContainer(
        "🛒 Server shop",
        `Use \`/buy <item_id>\` to purchase. ${config.economy.currencyEmoji} = coins.`,
        { color: config.colors.gold, fields }
      )],
      flags: COMPONENTS_V2_FLAG,
    });
  },
};
