// src/commands/economy/useitem.js
const { SlashCommandBuilder } = require("discord.js");
const Wallet      = require("../../models/Wallet");
const Reputation  = require("../../models/Reputation");
const Marriage    = require("../../models/Marriage");
const Transaction = require("../../models/Transaction");
const config      = require("../../config");
const {
  successContainer,
  errorContainer,
  infoContainer,
  componentReply,
  COMPONENTS_V2_FLAG,
} = require("../../utils/embedBuilder");

// Items that require a @user target
const TARGET_REQUIRED = ["snack", "red_envelope", "evil_eye", "love_letter"];

// Items that cannot be manually used (passive or auto-consumed)
const PASSIVE_ITEMS = ["bank_pass", "trophy", "rep_booster", "heart_badge", "crown",
                       "lucky_charm", "shield", "investors_brief", "wish", "mystery_box",
                       "lottery_ticket", "disguise_kit"];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("useitem")
    .setDescription("Use a consumable item from your inventory 🎒")
    .addStringOption((o) =>
      o.setName("item").setDescription("Item ID to use (e.g. snack, red_envelope)").setRequired(true)
    )
    .addUserOption((o) =>
      o.setName("user").setDescription("Target user (required for some items)")
    ),

  async execute(interaction) {
    const itemId  = interaction.options.getString("item").toLowerCase().trim();
    const target  = interaction.options.getUser("user");
    const guildId = interaction.guildId;
    const userId  = interaction.user.id;

    // ── Passive item check ────────────────────────────────────────────────────
    if (PASSIVE_ITEMS.includes(itemId)) {
      return componentReply(interaction,
        errorContainer("Can't use manually",
          `**${itemId}** activates automatically when purchased or is a passive item. No manual use needed!`
        ),
        { ephemeral: true }
      );
    }

    // ── Target required check ─────────────────────────────────────────────────
    if (TARGET_REQUIRED.includes(itemId) && !target) {
      return componentReply(interaction,
        errorContainer("Target required", `You need to specify a **@user** when using \`${itemId}\`.`),
        { ephemeral: true }
      );
    }

    if (target && (target.id === userId)) {
      if (["evil_eye"].includes(itemId)) {
        return componentReply(interaction,
          errorContainer("Can't target yourself!", "Pick someone else."),
          { ephemeral: true }
        );
      }
    }

    // ── Check inventory ───────────────────────────────────────────────────────
    const wallet = await Wallet.findOrCreate(userId, guildId);
    const slot   = wallet.inventory.find((i) => i.itemId === itemId && i.quantity > 0);

    if (!slot) {
      return componentReply(interaction,
        errorContainer("Not in inventory", `You don't have any **${itemId}** in your inventory. Buy one from \`/shop\`!`),
        { ephemeral: true }
      );
    }

    // ── Consume one from inventory ─────────────────────────────────────────────
    const consumeOne = () => {
      slot.quantity -= 1;
      if (slot.quantity <= 0) {
        const idx = wallet.inventory.findIndex((i) => i.itemId === itemId);
        if (idx !== -1) wallet.inventory.splice(idx, 1);
      }
    };

    // ── Item effects ──────────────────────────────────────────────────────────

    // 🍫 Snack — give target +15 coins
    if (itemId === "snack") {
      const targetWallet = await Wallet.findOrCreate(target.id, guildId);
      targetWallet.addCoins(15);
      await targetWallet.save();
      consumeOne();
      await wallet.save();

      return interaction.reply({
        components: [successContainer(
          `🍫 Snack delivered!`,
          `You gave **${target.username}** a snack and **+15** ${config.economy.currencyEmoji}! How sweet! 🍫`
        )],
        flags: COMPONENTS_V2_FLAG,
      });
    }

    // 🧧 Red Envelope — send 50–150 random coins to target
    if (itemId === "red_envelope") {
      const gift = Math.floor(Math.random() * 101) + 50; // 50–150
      const targetWallet = await Wallet.findOrCreate(target.id, guildId);
      wallet.addCoins(-gift);
      targetWallet.addCoins(gift);
      consumeOne();
      await Promise.all([wallet.save(), targetWallet.save()]);
      await Transaction.log({ guildId, fromUserId: userId, toUserId: target.id, amount: gift, type: "gift", note: "Red Envelope" });

      return interaction.reply({
        components: [successContainer(
          `🧧 Red Envelope sent!`,
          `You sent **${target.username}** a Red Envelope with **${gift}** ${config.economy.currencyEmoji} inside! 🎉\n\n**Your balance: ${wallet.coins.toLocaleString()} coins**`,
          { thumbnailUrl: target.displayAvatarURL({ dynamic: true }) }
        )],
        flags: COMPONENTS_V2_FLAG,
      });
    }

    // 🧿 Evil Eye — target loses 5% of their coins (min 10, max 100)
    if (itemId === "evil_eye") {
      if (target.bot) {
        return componentReply(interaction, errorContainer("Can't target bots!", "Bots have no coins to steal."), { ephemeral: true });
      }
      const targetWallet = await Wallet.findOrCreate(target.id, guildId);
      const loss = Math.min(100, Math.max(10, Math.floor(targetWallet.coins * 0.05)));
      targetWallet.addCoins(-loss);
      consumeOne();
      await Promise.all([wallet.save(), targetWallet.save()]);
      await Transaction.log({ guildId, fromUserId: userId, toUserId: target.id, amount: -loss, type: "rob", note: "Evil Eye" });

      return interaction.reply({
        components: [successContainer(
          `🧿 Evil Eye cast!`,
          `You cursed **${target.username}** — they lost **${loss}** ${config.economy.currencyEmoji}! 🧿\n-# They now have ${targetWallet.coins.toLocaleString()} coins.`
        )],
        flags: COMPONENTS_V2_FLAG,
      });
    }

    // 💌 Love Letter — both sender and spouse get +1 rep
    if (itemId === "love_letter") {
      const marriage = await Marriage.findOne({
        guildId, active: true,
        $or: [
          { partnerId1: userId, partnerId2: target.id },
          { partnerId1: target.id, partnerId2: userId },
        ],
      });

      if (!marriage) {
        return componentReply(interaction,
          errorContainer("Not your spouse!", `**${target.username}** is not your spouse. Love Letters can only be sent to your married partner.`),
          { ephemeral: true }
        );
      }

      const [senderRep, targetRep] = await Promise.all([
        Reputation.findOrCreate(userId, guildId),
        Reputation.findOrCreate(target.id, guildId),
      ]);

      senderRep.points += 1;
      targetRep.points += 1;
      await Promise.all([senderRep.save(), targetRep.save()]);
      consumeOne();
      await wallet.save();

      return interaction.reply({
        components: [successContainer(
          `💌 Love Letter sent!`,
          `You sent a Love Letter to your spouse **${target.username}**! 💕\n\nBoth of you received **+1** ⭐ reputation point!`,
          { thumbnailUrl: target.displayAvatarURL({ dynamic: true }) }
        )],
        flags: COMPONENTS_V2_FLAG,
      });
    }

    // ── Unknown usable item ───────────────────────────────────────────────────
    return componentReply(interaction,
      errorContainer("Unknown item", `\`${itemId}\` doesn't have a use action. Check \`/inventory\` for usable items.`),
      { ephemeral: true }
    );
  },
};
