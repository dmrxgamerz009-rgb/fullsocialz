// src/commands/economy/rob.js
const { SlashCommandBuilder } = require("discord.js");
const Wallet = require("../../models/Wallet");
const Transaction = require("../../models/Transaction");
const config = require("../../config");
const { successContainer, errorContainer, componentReply, formatTime, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rob")
    .setDescription("Attempt to rob another user 🦹")
    .addUserOption((o) => o.setName("user").setDescription("Who to rob").setRequired(true)),

  async execute(interaction) {
    const target  = interaction.options.getUser("user");
    const guildId = interaction.guildId;
    const userId  = interaction.user.id;
    const cfg     = config.economy.rob;

    if (target.id === userId)
      return componentReply(interaction, errorContainer("Nope!", "You can't rob yourself."), { ephemeral: true });
    if (target.bot)
      return componentReply(interaction, errorContainer("Nope!", "Bots have no coins to steal."), { ephemeral: true });

    const robberWallet = await Wallet.findOrCreate(userId, guildId);
    const victimWallet = await Wallet.findOrCreate(target.id, guildId);

    // Robber cooldown
    if (robberWallet.lastRob) {
      const remaining = robberWallet.lastRob.getTime() + cfg.cooldownMs - Date.now();
      if (remaining > 0)
        return componentReply(interaction,
          errorContainer("⏰ Lay low!", `You need to wait **${formatTime(remaining)}** before robbing again.`),
          { ephemeral: true }
        );
    }

    // Check if robber has a Disguise Kit — bypasses victim's shield
    const disguiseIdx = robberWallet.inventory?.findIndex((i) => i.itemId === "disguise_kit" && i.quantity > 0) ?? -1;
    const hasDisguise = disguiseIdx !== -1;

    // Victim protection (from rob shield or recent rob)
    if (victimWallet.robProtectedUntil && victimWallet.robProtectedUntil > new Date()) {
      if (!hasDisguise) {
        return componentReply(interaction,
          errorContainer("🛡️ Protected!", `**${target.username}** has a rob shield active! Buy a 🎭 Disguise Kit to bypass it.`),
          { ephemeral: true }
        );
      }
      // Consume the disguise kit
      robberWallet.inventory[disguiseIdx].quantity -= 1;
      if (robberWallet.inventory[disguiseIdx].quantity <= 0) {
        robberWallet.inventory.splice(disguiseIdx, 1);
      }
    }

    // Victim must have enough coins
    if (victimWallet.coins < cfg.minVictimBalance) {
      return componentReply(interaction,
        errorContainer("Not worth it!", `**${target.username}** only has **${victimWallet.coins}** coins — not worth the risk.`),
        { ephemeral: true }
      );
    }

    robberWallet.lastRob = new Date();

    const success = Math.random() < cfg.successChance;

    if (success) {
      const stolen = Math.max(1, Math.floor(victimWallet.coins * cfg.maxSteal * Math.random()));

      robberWallet.addCoins(stolen);
      victimWallet.addCoins(-stolen);

      // Give victim 8hr rob protection
      victimWallet.robProtectedUntil = new Date(Date.now() + cfg.protectionMs);

      await Promise.all([robberWallet.save(), victimWallet.save()]);
      await Transaction.log({ guildId, fromUserId: userId, toUserId: target.id, amount: -stolen, type: "rob" });

      return interaction.reply({
        components: [successContainer(
          "🦹 Rob successful!",
          `You snuck past **${target.username}** and stole **${stolen}** ${config.economy.currencyEmoji}!\n\n**Your balance: ${robberWallet.coins.toLocaleString()} coins**\n-# ${target.username} is now protected for 8 hours.`
        )],
        flags: COMPONENTS_V2_FLAG,
      });
    } else {
      // Failed — robber loses 10% of their coins as a fine
      const fine = Math.max(10, Math.floor(robberWallet.coins * 0.1));
      robberWallet.addCoins(-Math.min(fine, robberWallet.coins));
      await robberWallet.save();

      return componentReply(interaction,
        errorContainer(
          "🚨 Caught red-handed!",
          `You failed to rob **${target.username}** and got caught!\n\nYou paid a **${fine}** coin fine.\n**Your balance: ${robberWallet.coins.toLocaleString()} coins**`
        )
      );
    }
  },
};
