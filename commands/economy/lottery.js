// src/commands/economy/lottery.js
// Daily jackpot lottery — requires a 🎟️ Lottery Ticket to enter.
// The jackpot grows by 25 coins each time someone enters.
// A random entered user wins once per day.

const { SlashCommandBuilder } = require("discord.js");
const mongoose    = require("mongoose");
const Wallet      = require("../../models/Wallet");
const Transaction = require("../../models/Transaction");
const config      = require("../../config");
const {
  successContainer,
  errorContainer,
  infoContainer,
  componentReply,
  COMPONENTS_V2_FLAG,
} = require("../../utils/embedBuilder");

// ── Lightweight Lottery State model ──────────────────────────────────────────
const lotteryStateSchema = new mongoose.Schema({
  guildId:    { type: String, required: true, unique: true },
  jackpot:    { type: Number, default: 500 },
  entrants:   [{ userId: String, enteredAt: Date }],
  lastDrawAt: { type: Date, default: null },
}, { timestamps: true });

const LotteryState = mongoose.models.LotteryState
  || mongoose.model("LotteryState", lotteryStateSchema);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lottery")
    .setDescription("Daily jackpot lottery 🎟️")
    .addSubcommand((sub) =>
      sub.setName("enter").setDescription("Use a Lottery Ticket to enter today's draw")
    )
    .addSubcommand((sub) =>
      sub.setName("draw").setDescription("Draw the winner (auto: once per 24h)")
    )
    .addSubcommand((sub) =>
      sub.setName("status").setDescription("View current jackpot and entrants")
    ),

  async execute(interaction) {
    const sub     = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const userId  = interaction.user.id;

    // Find or create state for this guild
    let state = await LotteryState.findOne({ guildId });
    if (!state) state = await LotteryState.create({ guildId });

    // ── enter ─────────────────────────────────────────────────────────────────
    if (sub === "enter") {
      // Check if already entered today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const alreadyIn = state.entrants.some(
        (e) => e.userId === userId && new Date(e.enteredAt) >= today
      );
      if (alreadyIn) {
        return componentReply(interaction,
          errorContainer("Already entered!", "You've already entered today's lottery. Come back tomorrow!"),
          { ephemeral: true }
        );
      }

      // Check ticket in inventory
      const wallet = await Wallet.findOrCreate(userId, guildId);
      const ticketSlot = wallet.inventory.find((i) => i.itemId === "lottery_ticket" && i.quantity > 0);
      if (!ticketSlot) {
        return componentReply(interaction,
          errorContainer("No ticket!", `You need a 🎟️ Lottery Ticket to enter. Buy one from \`/shop\` for **50** ${config.economy.currencyEmoji}!`),
          { ephemeral: true }
        );
      }

      // Consume one ticket
      ticketSlot.quantity -= 1;
      if (ticketSlot.quantity <= 0) {
        const idx = wallet.inventory.findIndex((i) => i.itemId === "lottery_ticket");
        if (idx !== -1) wallet.inventory.splice(idx, 1);
      }
      await wallet.save();

      // Add entrant, grow jackpot
      state.entrants.push({ userId, enteredAt: new Date() });
      state.jackpot += 25;
      await state.save();

      return componentReply(interaction,
        successContainer(
          "🎟️ Entered!",
          `You used a Lottery Ticket and entered today's draw!\n\n🏆 Current jackpot: **${state.jackpot}** ${config.economy.currencyEmoji}\n👥 Entrants today: **${state.entrants.filter((e) => new Date(e.enteredAt) >= today).length}**\n\nGood luck! Draw happens with \`/lottery draw\`.`
        )
      );
    }

    // ── draw ──────────────────────────────────────────────────────────────────
    if (sub === "draw") {
      const now   = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Only one draw per day
      if (state.lastDrawAt && state.lastDrawAt >= today) {
        const nextDraw = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        const ms = nextDraw - now;
        const h  = Math.floor(ms / 3_600_000);
        const m  = Math.floor((ms % 3_600_000) / 60_000);
        return componentReply(interaction,
          errorContainer("Already drawn!", `Today's lottery has already been drawn. Next draw in **${h}h ${m}m**.`),
          { ephemeral: true }
        );
      }

      // Get today's entrants
      const todayEntrants = state.entrants.filter((e) => new Date(e.enteredAt) >= today);
      if (todayEntrants.length === 0) {
        return componentReply(interaction,
          errorContainer("No entrants!", "Nobody entered today's lottery. The jackpot carries over to tomorrow!"),
          { ephemeral: true }
        );
      }

      // Pick random winner
      const winner = todayEntrants[Math.floor(Math.random() * todayEntrants.length)];
      const prize  = state.jackpot;

      const winnerWallet = await Wallet.findOrCreate(winner.userId, guildId);
      winnerWallet.addCoins(prize);
      await winnerWallet.save();

      await Transaction.log({ guildId, fromUserId: "lottery", toUserId: winner.userId, amount: prize, type: "gamble", note: "Lottery jackpot" });

      // Reset state
      state.jackpot    = 500;
      state.entrants   = [];
      state.lastDrawAt = now;
      await state.save();

      let winnerTag = "Unknown";
      try { winnerTag = (await interaction.client.users.fetch(winner.userId)).username; } catch {}

      return interaction.reply({
        components: [successContainer(
          "🎉 Lottery winner!",
          `The draw is complete!\n\n🏆 **Winner: ${winnerTag}**\n${config.economy.currencyEmoji} Prize: **${prize} coins**\n👥 Total entrants: **${todayEntrants.length}**\n\n-# Jackpot resets to 500 coins for tomorrow's draw.`
        )],
        flags: COMPONENTS_V2_FLAG,
      });
    }

    // ── status ────────────────────────────────────────────────────────────────
    if (sub === "status") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEntrants = state.entrants.filter((e) => new Date(e.enteredAt) >= today);

      const alreadyIn = todayEntrants.some((e) => e.userId === userId);
      const drawn     = state.lastDrawAt && state.lastDrawAt >= today;

      const fields = [
        { name: "🏆 Jackpot", value: `**${state.jackpot}** ${config.economy.currencyEmoji}` },
        { name: "👥 Today's entrants", value: `**${todayEntrants.length}** member(s)` },
        { name: "📊 Your status", value: drawn ? "Draw already done today" : alreadyIn ? "✅ You're entered!" : "❌ Not entered — buy a 🎟️ Lottery Ticket and use `/lottery enter`" },
        { name: "⏰ Draw", value: drawn ? "Completed for today" : "Use `/lottery draw` to trigger" },
      ];

      return componentReply(interaction,
        infoContainer("🎟️ Lottery status", "Today's lottery jackpot information.", {
          color: config.colors.gold, fields,
        })
      );
    }
  },
};
