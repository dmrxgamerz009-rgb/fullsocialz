// src/commands/economy/buy.js
const { SlashCommandBuilder } = require("discord.js");
const ShopItem    = require("../../models/ShopItem");
const Wallet      = require("../../models/Wallet");
const Transaction = require("../../models/Transaction");
const config      = require("../../config");
const {
  successContainer,
  errorContainer,
  componentReply,
  COMPONENTS_V2_FLAG,
} = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("buy")
    .setDescription("Purchase an item from the shop 💳")
    .addStringOption((o) =>
      o.setName("item").setDescription("Item ID from /shop").setRequired(true)
    )
    .addIntegerOption((o) =>
      o.setName("quantity")
        .setDescription("How many to buy (default: 1)")
        .setMinValue(1)
        .setMaxValue(10)
    ),

  async execute(interaction) {
    const itemId   = interaction.options.getString("item").toLowerCase().trim();
    const quantity = interaction.options.getInteger("quantity") ?? 1;
    const guildId  = interaction.guildId;
    const userId   = interaction.user.id;

    // ── Find item ─────────────────────────────────────────────────────────────
    const shopItem = await ShopItem.findOne({ guildId, itemId, active: true });
    if (!shopItem) {
      return componentReply(interaction,
        errorContainer("Item not found", `No item with ID \`${itemId}\` exists. Use \`/shop\` to browse.`),
        { ephemeral: true }
      );
    }

    // ── Stock check ───────────────────────────────────────────────────────────
    if (shopItem.stock === 0) {
      return componentReply(interaction,
        errorContainer("❌ Out of stock!", `**${shopItem.name}** is completely sold out.`),
        { ephemeral: true }
      );
    }
    if (shopItem.stock > 0 && shopItem.stock < quantity) {
      return componentReply(interaction,
        errorContainer("Not enough stock!", `Only **${shopItem.stock}** of **${shopItem.name}** left.`),
        { ephemeral: true }
      );
    }

    const wallet    = await Wallet.findOrCreate(userId, guildId);
    const totalCost = shopItem.price * quantity;

    // ── Affordability ─────────────────────────────────────────────────────────
    if (wallet.coins < totalCost) {
      return componentReply(interaction,
        errorContainer("Can't afford it!",
          `**${quantity}× ${shopItem.name}** costs **${totalCost}** ${config.economy.currencyEmoji} but you only have **${wallet.coins}**.`
        ),
        { ephemeral: true }
      );
    }

    // ── Max per user check ────────────────────────────────────────────────────
    if (shopItem.maxPerUser > 0) {
      const currentOwned = wallet.inventory.find((i) => i.itemId === itemId)?.quantity ?? 0;
      if (currentOwned + quantity > shopItem.maxPerUser) {
        const canBuy = shopItem.maxPerUser - currentOwned;
        if (canBuy <= 0) {
          return componentReply(interaction,
            errorContainer("Limit reached!", `You already own the max of **${shopItem.maxPerUser}** of **${shopItem.name}**.`),
            { ephemeral: true }
          );
        }
        return componentReply(interaction,
          errorContainer("Limit reached!", `You can only buy **${canBuy}** more of **${shopItem.name}**.`),
          { ephemeral: true }
        );
      }
    }

    // ── Deduct coins ──────────────────────────────────────────────────────────
    wallet.addCoins(-totalCost);

    // ── Add to inventory ──────────────────────────────────────────────────────
    const existingSlot = wallet.inventory.find((i) => i.itemId === itemId);
    if (existingSlot) {
      existingSlot.quantity += quantity;
    } else {
      wallet.inventory.push({
        itemId:   shopItem.itemId,
        name:     shopItem.name,
        emoji:    shopItem.emoji,
        quantity,
        roleId:   shopItem.roleId ?? null,
      });
    }

    // ── Decrement limited stock ───────────────────────────────────────────────
    if (shopItem.stock > 0) {
      shopItem.stock -= quantity;
      await shopItem.save();
    }

    // ── Item effects ──────────────────────────────────────────────────────────
    const bonusLines = [];

    // 🎁 Mystery Box — open immediately, consume from inventory
    if (itemId === "mystery_box") {
      const slot = wallet.inventory.find((i) => i.itemId === "mystery_box");
      for (let i = 0; i < quantity; i++) {
        const bonus = Math.floor(Math.random() * 191) + 10;
        wallet.addCoins(bonus);
        bonusLines.push(`🎁 Mystery box #${i + 1}: found **${bonus}** coins!`);
        if (slot) slot.quantity -= 1;
      }
      // Remove from inventory if all consumed
      const idx = wallet.inventory.findIndex((i) => i.itemId === "mystery_box");
      if (idx !== -1 && wallet.inventory[idx].quantity <= 0) wallet.inventory.splice(idx, 1);
    }

    // 🛡️ Rob Shield — activate immediately
    if (itemId === "shield") {
      wallet.robProtectedUntil = new Date(Date.now() + config.economy.rob.protectionMs * quantity);
      bonusLines.push(`🛡️ Rob shield active for **${8 * quantity}h**!`);
    }

    // 💼 Bank Pass — raises coin cap, passive (flagged on wallet)
    if (itemId === "bank_pass") {
      wallet.hasBankPass = true;
      bonusLines.push(`💼 Bank Pass activated! Your coin cap is now **50,000**.`);
    }

    // 🪄 Wish — immediately reset daily & weekly cooldowns
    if (itemId === "wish") {
      wallet.lastDaily  = null;
      wallet.lastWeekly = null;
      // consume from inventory immediately
      const idx = wallet.inventory.findIndex((i) => i.itemId === "wish");
      if (idx !== -1) {
        wallet.inventory[idx].quantity -= 1;
        if (wallet.inventory[idx].quantity <= 0) wallet.inventory.splice(idx, 1);
      }
      bonusLines.push(`🪄 Wish granted! Your \`/daily\` and \`/weekly\` cooldowns have been reset.`);
    }

    // 📈 Investor's Brief — flag for next /work use
    if (itemId === "investors_brief") {
      wallet.investorsBriefActive = true;
      bonusLines.push(`📈 Investor's Brief active! Your next \`/work\` payout will be **+50%**.`);
    }

    // 🏆 Trophy — cosmetic, stays in inventory
    if (itemId === "trophy") {
      bonusLines.push(`🏆 Trophy added to your inventory! It will show on your \`/profile\` and \`/lookup\`.`);
    }

    // 🎟️ Lottery Ticket — stays in inventory for /lottery draw
    if (itemId === "lottery_ticket") {
      bonusLines.push(`🎟️ Ticket saved! Use \`/lottery draw\` when the jackpot is ready.`);
    }

    // 🍫 Snack / 🧧 Red Envelope / 🧿 Evil Eye / 💌 Love Letter — usable items
    if (["snack", "red_envelope", "evil_eye", "love_letter"].includes(itemId)) {
      bonusLines.push(`${shopItem.emoji} Added to inventory. Use it with \`/useitem ${itemId} @user\`.`);
    }

    // 🎭 Disguise Kit — usable before rob
    if (itemId === "disguise_kit") {
      bonusLines.push(`🎭 In your inventory. Use \`/useitem disguise_kit\` before robbing to bypass shields.`);
    }

    await wallet.save();
    await Transaction.log({
      guildId,
      fromUserId: userId,
      toUserId:   null,
      amount:     -totalCost,
      type:       "buy",
      note:       `${quantity}× ${shopItem.name}`,
    });

    // ── Grant Discord role ────────────────────────────────────────────────────
    if (shopItem.roleId) {
      try {
        const member = await interaction.guild.members.fetch(userId);
        await member.roles.add(shopItem.roleId);
        bonusLines.push(`🎭 Role **granted** successfully!`);
      } catch {
        bonusLines.push(`-# ⚠️ Couldn't auto-grant role — contact an admin.`);
      }
    }

    const stockLine  = shopItem.stock >= 0 ? `\n-# 📦 Stock remaining: **${shopItem.stock}**` : "";
    const bonusBlock = bonusLines.length > 0 ? `\n\n${bonusLines.join("\n")}` : "";

    return componentReply(interaction,
      successContainer(
        `${shopItem.emoji} Purchase successful!`,
        `You bought **${quantity}× ${shopItem.name}** for **${totalCost}** ${config.economy.currencyEmoji}!${bonusBlock}\n\n**Balance: ${wallet.coins.toLocaleString()} coins**${stockLine}`
      )
    );
  },
};
