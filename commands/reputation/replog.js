// src/commands/reputation/replog.js
const { SlashCommandBuilder } = require("discord.js");
const Reputation = require("../../models/Reputation");
const emojis = require("../../emojis");
const config = require("../../config");
const {
  infoContainer,
  errorContainer,
  componentReply,
  COMPONENTS_V2_FLAG,
} = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("replog")
    .setDescription("View your recent reputation activity 📜")
    .addStringOption((o) =>
      o
        .setName("type")
        .setDescription("Show reps received or given")
        .addChoices(
          { name: "Received", value: "received" },
          { name: "Given", value: "given" }
        )
    ),

  async execute(interaction) {
    const type = interaction.options.getString("type") ?? "received";
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    const repData = await Reputation.findOrCreate(userId, guildId);

    if (type === "received") {
      const log = repData.repLog.slice(-10).reverse(); // most recent first

      if (log.length === 0) {
        return componentReply(
          interaction,
          errorContainer(`${emojis.reputation.rep} No reps`, "You haven't received any reps yet!"),
          { ephemeral: true }
        );
      }

      const lines = await Promise.all(
        log.map(async (entry) => {
          let fromName = "Unknown";
          try {
            const u = await interaction.client.users.fetch(entry.fromUserId);
            fromName = u.username;
          } catch { /* gone */ }

          const ts = Math.floor(new Date(entry.givenAt).getTime() / 1000);
          return `${emojis.reputation.rep} **${fromName}** → you • <t:${ts}:R>`;
        })
      );

      return componentReply(
        interaction,
        infoContainer(
          `${emojis.ui.scroll} Reps received`,
          lines.join("\n"),
          {
            color: config.colors.gold,
            fields: [{ name: "Total received", value: `**${repData.repsReceived}** reps` }],
          }
        ),
        { ephemeral: true }
      );
    }

    // ── Given log: scan all reps in guild where fromUserId === userId ─────────
    const allReps = await Reputation.find({ guildId, "repLog.fromUserId": userId }).lean();

    if (allReps.length === 0) {
      return componentReply(
        interaction,
        errorContainer(`${emojis.reputation.rep} No reps given`, "You haven't given any reps yet! Use `/rep give`."),
        { ephemeral: true }
      );
    }

    const givenEntries = [];
    for (const doc of allReps) {
      for (const entry of doc.repLog) {
        if (entry.fromUserId === userId) {
          givenEntries.push({ toUserId: doc.userId, givenAt: entry.givenAt });
        }
      }
    }

    givenEntries.sort((a, b) => new Date(b.givenAt) - new Date(a.givenAt));
    const recent = givenEntries.slice(0, 10);

    const lines = await Promise.all(
      recent.map(async (entry) => {
        let toName = "Unknown";
        try {
          const u = await interaction.client.users.fetch(entry.toUserId);
          toName = u.username;
        } catch { /* gone */ }

        const ts = Math.floor(new Date(entry.givenAt).getTime() / 1000);
        return `${emojis.reputation.rep} you → **${toName}** • <t:${ts}:R>`;
      })
    );

    return componentReply(
      interaction,
      infoContainer(
        `${emojis.ui.scroll} Reps given`,
        lines.join("\n"),
        {
          color: config.colors.gold,
          fields: [{ name: "Total given", value: `**${repData.repsGiven}** reps` }],
        }
      ),
      { ephemeral: true }
    );
  },
};
