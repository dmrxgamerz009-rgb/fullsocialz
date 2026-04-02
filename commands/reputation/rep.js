// src/commands/reputation/rep.js
const { SlashCommandBuilder } = require("discord.js");
const Reputation = require("../../models/Reputation");
const emojis = require("../../emojis");
const config = require("../../config");
const { checkCooldown, setCooldown, targetKey } = require("../../utils/cooldownManager");
const Wallet = require("../../models/Wallet");
const Transaction = require("../../models/Transaction");
const {
  successContainer,
  errorContainer,
  infoContainer,
  cooldownContainer,
  componentReply,
  COMPONENTS_V2_FLAG,
} = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rep")
    .setDescription("Reputation commands")
    .addSubcommand((sub) =>
      sub
        .setName("give")
        .setDescription("Give reputation to someone ⭐")
        .addUserOption((o) =>
          o.setName("user").setDescription("Who to rep").setRequired(true)
        )
        .addStringOption((o) =>
          o.setName("reason").setDescription("Why you're repping them (optional)").setMaxLength(100)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("check")
        .setDescription("Check someone's reputation")
        .addUserOption((o) =>
          o.setName("user").setDescription("User to check (defaults to yourself)")
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove a rep you gave to someone")
        .addUserOption((o) =>
          o.setName("user").setDescription("Who to remove rep from").setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const giverId = interaction.user.id;

    // ── /rep give ─────────────────────────────────────────────────────────────
    if (sub === "give") {
      const target = interaction.options.getUser("user");
      const reason = interaction.options.getString("reason");

      if (target.id === giverId) {
        return componentReply(interaction, errorContainer("Nice try!", "You can't rep yourself! 😅"), { ephemeral: true });
      }
      if (target.bot) {
        return componentReply(interaction, errorContainer("Nope!", "Bots don't need reputation."), { ephemeral: true });
      }

      // Check 2hr cooldown keyed per target
      const cdKey = targetKey("rep", target.id);
      const cd = await checkCooldown(giverId, guildId, cdKey);
      if (cd.onCooldown) {
        return componentReply(
          interaction,
          cooldownContainer("rep", cd.remainingMs, target.username),
          { ephemeral: true }
        );
      }

      // Apply rep
      const [giverRep, targetRep] = await Promise.all([
        Reputation.findOrCreate(giverId, guildId),
        Reputation.findOrCreate(target.id, guildId),
      ]);

      targetRep.points += config.reputation.pointsPerRep;
      targetRep.repsReceived += 1;
      targetRep.repLog.push({ fromUserId: giverId });
      // Keep log to last 20 entries
      if (targetRep.repLog.length > 20) targetRep.repLog.shift();

      giverRep.repsGiven += 1;

      await Promise.all([giverRep.save(), targetRep.save()]);

      // Integration: reward giver with coins for spreading rep
      if (config.economy?.repReward > 0) {
        const giverWallet = await Wallet.findOrCreate(giverId, guildId);
        giverWallet.addCoins(config.economy.repReward);
        await giverWallet.save();
        await Transaction.log({ guildId, fromUserId: giverId, toUserId: null, amount: config.economy.repReward, type: "rep_reward" });
      }

      // Set 2hr cooldown
      await setCooldown(giverId, guildId, cdKey, config.reputation.cooldowns.rep);

      const reasonLine = reason ? `\n> ${emojis.profile.bio} *"${reason}"*` : "";
      const container = successContainer(
        `${emojis.reputation.rep} Rep given!`,
        `You gave a reputation point to **${target.username}**!${reasonLine}\n\nThey now have **${targetRep.points}** ${emojis.reputation.rep} rep points.`,
        { thumbnailUrl: target.displayAvatarURL({ dynamic: true }) }
      );

      return interaction.reply({ components: [container], flags: COMPONENTS_V2_FLAG });
    }

    // ── /rep check ────────────────────────────────────────────────────────────
    if (sub === "check") {
      const target = interaction.options.getUser("user") ?? interaction.user;
      const repData = await Reputation.findOrCreate(target.id, guildId);

      // Figure out rank
      const rank = await Reputation.countDocuments({
        guildId,
        points: { $gt: repData.points },
      }) + 1;

      const fields = [
        { name: `${emojis.reputation.rep} Points`, value: `**${repData.points}** rep points` },
        { name: `${emojis.reputation.leaderboard} Rank`, value: `**#${rank}** in this server` },
        { name: `${emojis.reputation.upvote} Reps received`, value: `${repData.repsReceived}` },
        { name: `${emojis.reputation.badge} Reps given`, value: `${repData.repsGiven}` },
        {
          name: `${emojis.reputation.endorse} Endorsements`,
          value: `${repData.endorsements.length} endorsement(s)`,
        },
      ];

      const container = infoContainer(
        `${emojis.reputation.rep} ${target.username}'s reputation`,
        `Here's a full breakdown of **${target.username}'s** rep.`,
        {
          color: config.colors.gold,
          fields,
          thumbnailUrl: target.displayAvatarURL({ dynamic: true }),
        }
      );

      return interaction.reply({ components: [container], flags: COMPONENTS_V2_FLAG });
    }

    // ── /rep remove ───────────────────────────────────────────────────────────
    if (sub === "remove") {
      const target = interaction.options.getUser("user");

      // Check if this user has repped the target recently (in log)
      const targetRep = await Reputation.findOne({ userId: target.id, guildId });
      if (!targetRep) {
        return componentReply(
          interaction,
          errorContainer("Nothing to remove", `**${target.username}** has no rep to remove.`),
          { ephemeral: true }
        );
      }

      const logEntry = targetRep.repLog.findIndex((e) => e.fromUserId === giverId);
      if (logEntry === -1) {
        return componentReply(
          interaction,
          errorContainer("No rep found", `You don't have a recent rep to remove from **${target.username}**.`),
          { ephemeral: true }
        );
      }

      // Remove the rep
      targetRep.repLog.splice(logEntry, 1);
      targetRep.points = Math.max(0, targetRep.points - config.reputation.pointsPerRep);
      targetRep.repsReceived = Math.max(0, targetRep.repsReceived - 1);
      await targetRep.save();

      // Also update giver stats
      await Reputation.findOneAndUpdate(
        { userId: giverId, guildId },
        { $inc: { repsGiven: -1 } }
      );

      // Clear the cooldown so they can rep again
      const cdKey = targetKey("rep", target.id);
      const Cooldown = require("../../models/Cooldown");
      await Cooldown.findOneAndDelete({ userId: giverId, guildId, action: cdKey });

      return componentReply(
        interaction,
        successContainer(
          `${emojis.reputation.rep} Rep removed`,
          `Removed your rep from **${target.username}**. Your cooldown has been reset.`
        ),
        { ephemeral: true }
      );
    }
  },
};
