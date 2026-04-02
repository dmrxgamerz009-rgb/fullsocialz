// src/commands/economy/inventory.js
const { SlashCommandBuilder } = require("discord.js");
const Wallet = require("../../models/Wallet");
const config = require("../../config");
const { infoContainer, errorContainer, componentReply } = require("../../utils/embedBuilder");

const USABLE_ITEMS  = ["snack", "red_envelope", "evil_eye", "love_letter"];
const LOTTERY_ITEMS = ["lottery_ticket"];
const ROB_ITEMS     = ["disguise_kit"];

function getUsageHint(itemId, roleId) {
  if (roleId)                    return "🎭 role item";
  if (USABLE_ITEMS.includes(itemId))  return `use: /useitem ${itemId} @user`;
  if (LOTTERY_ITEMS.includes(itemId)) return "use: /lottery enter";
  if (ROB_ITEMS.includes(itemId))     return "use: /useitem disguise_kit (before /rob)";
  return "passive";
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("inventory")
    .setDescription("View your item inventory 🎒")
    .addUserOption((o) =>
      o.setName("user").setDescription("View another user's inventory (defaults to yourself)")
    ),

  async execute(interaction) {
    const target  = interaction.options.getUser("user") ?? interaction.user;
    const guildId = interaction.guildId;

    const wallet = await Wallet.findOrCreate(target.id, guildId);
    const items  = wallet.inventory.filter((i) => i.quantity > 0);

    if (items.length === 0) {
      return componentReply(interaction,
        errorContainer("🎒 Empty inventory",
          `**${target.username}** has no items. Buy some from \`/shop\`!`)
      );
    }

    const lines = items.map((item) => {
      const hint = getUsageHint(item.itemId, item.roleId);
      return `${item.emoji} **${item.name}** × ${item.quantity}\n  -# ${hint}`;
    });

    // Show active buffs separately
    const buffs = [];
    if (wallet.hasBankPass)          buffs.push("💼 Bank Pass active (50k cap)");
    if (wallet.investorsBriefActive) buffs.push("📈 Investor's Brief ready (next /work +50%)");
    if (wallet.robProtectedUntil && wallet.robProtectedUntil > new Date()) {
      const ms = wallet.robProtectedUntil - Date.now();
      const h  = Math.floor(ms / 3_600_000);
      const m  = Math.floor((ms % 3_600_000) / 60_000);
      buffs.push(`🛡️ Rob Shield active (${h}h ${m}m left)`);
    }

    const fields = [
      { name: "Items", value: lines.join("\n\n") },
      ...(buffs.length > 0 ? [{ name: "⚡ Active effects", value: buffs.join("\n") }] : []),
      { name: `${config.economy.currencyEmoji} Balance`, value: `**${wallet.coins.toLocaleString()}** coins` },
    ];

    return componentReply(interaction,
      infoContainer(
        `🎒 ${target.username}'s inventory`,
        `**${items.length}** item type(s) in inventory.`,
        {
          color: config.colors.primary,
          fields,
          thumbnailUrl: target.displayAvatarURL({ dynamic: true }),
        }
      )
    );
  },
};
