// src/commands/economy/work.js
const { SlashCommandBuilder } = require("discord.js");
const Wallet = require("../../models/Wallet");
const Transaction = require("../../models/Transaction");
const config = require("../../config");
const { successContainer, errorContainer, componentReply, formatTime } = require("../../utils/embedBuilder");

const JOBS = [
  { title: "Software Engineer", action: "shipped a feature" },
  { title: "Chef", action: "cooked a five-star meal" },
  { title: "Streamer", action: "went live and got donations" },
  { title: "Artist", action: "sold a commissioned piece" },
  { title: "Dog Walker", action: "walked 8 dogs at once somehow" },
  { title: "Barista", action: "made 200 coffees without spilling" },
  { title: "Delivery Driver", action: "finished all deliveries on time" },
  { title: "Gardener", action: "tended the community garden" },
  { title: "Musician", action: "busked in the plaza" },
  { title: "Nurse", action: "worked a double shift" },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("work")
    .setDescription("Work for coins 💼"),

  async execute(interaction) {
    const userId  = interaction.user.id;
    const guildId = interaction.guildId;
    const cfg     = config.economy.work;

    const wallet = await Wallet.findOrCreate(userId, guildId);

    if (wallet.lastWork) {
      const remaining = wallet.lastWork.getTime() + cfg.cooldownMs - Date.now();
      if (remaining > 0) {
        return componentReply(interaction,
          errorContainer("⏰ Still working!", `You're still on shift! Break in **${formatTime(remaining)}**.`),
          { ephemeral: true }
        );
      }
    }

    let earned = Math.floor(Math.random() * (cfg.max - cfg.min + 1)) + cfg.min;

    // Investor's Brief — +50% bonus, consume the flag
    let briefUsed = false;
    if (wallet.investorsBriefActive) {
      earned = Math.floor(earned * 1.5);
      wallet.investorsBriefActive = false;
      briefUsed = true;
    }
    const job    = JOBS[Math.floor(Math.random() * JOBS.length)];

    wallet.addCoins(earned);
    wallet.lastWork = new Date();
    await wallet.save();

    await Transaction.log({ guildId, fromUserId: userId, toUserId: null, amount: earned, type: "work" });

    return componentReply(interaction,
      successContainer(
        "💼 Work complete!",
        [
          `You worked as a **${job.title}** and ${job.action}.`,
          briefUsed ? `\n📈 Investor's Brief bonus applied! (+50%)` : "",
          `\n\nEarned: **${earned}** ${config.economy.currencyEmoji}`,
          `\n**Balance: ${wallet.coins.toLocaleString()} coins**`,
        ].join("")
      )
    );
  },
};
