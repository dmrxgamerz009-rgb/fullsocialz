// src/commands/relationship/vow.js
const { SlashCommandBuilder } = require("discord.js");
const Vow      = require("../../models/Vow");
const Marriage = require("../../models/Marriage");
const config   = require("../../config");
const {
  successContainer, errorContainer, infoContainer,
  componentReply, COMPONENTS_V2_FLAG,
} = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("vow")
    .setDescription("Write or read marriage vows 💍")
    .addSubcommand((sub) =>
      sub.setName("write")
        .setDescription("Write a vow to your spouse")
        .addStringOption((o) =>
          o.setName("vow").setDescription("Your vow message").setRequired(true).setMaxLength(300)
        )
        .addBooleanOption((o) =>
          o.setName("private").setDescription("Keep this vow private? (default: public)")
        )
    )
    .addSubcommand((sub) =>
      sub.setName("read")
        .setDescription("Read vows between two people")
        .addUserOption((o) => o.setName("user").setDescription("View another user's vows (defaults to yourself)"))
    ),

  async execute(interaction) {
    const sub     = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const userId  = interaction.user.id;

    if (sub === "write") {
      const vowText = interaction.options.getString("vow");
      const priv    = interaction.options.getBoolean("private") ?? false;

      // Must be married
      const marriage = await Marriage.findActiveMarriage(userId, guildId);
      if (!marriage) {
        return componentReply(interaction,
          errorContainer("Not married", "You need to be married to write a vow. Use `/marry` first!"),
          { ephemeral: true }
        );
      }

      const partnerId = marriage.getPartner(userId);
      let partner;
      try { partner = await interaction.client.users.fetch(partnerId); }
      catch { partner = { username: "your spouse" }; }

      await Vow.findOneAndUpdate(
        { guildId, fromUserId: userId, toUserId: partnerId },
        { vow: vowText, public: !priv },
        { upsert: true, new: true }
      );

      return componentReply(interaction,
        successContainer(
          "💍 Vow written!",
          `Your vow to **${partner.username}**:\n\n> *"${vowText}"*\n\n-# ${priv ? "🔒 Private vow" : "🌐 Public vow"}`
        ),
        { ephemeral: true }
      );
    }

    if (sub === "read") {
      const target   = interaction.options.getUser("user") ?? interaction.user;
      const isSelf   = target.id === userId;

      const vows = await Vow.find({
        guildId,
        $or: [{ fromUserId: target.id }, { toUserId: target.id }],
        ...(isSelf ? {} : { public: true }),
      }).sort({ updatedAt: -1 }).limit(5);

      if (vows.length === 0) {
        return componentReply(interaction,
          errorContainer("No vows", `**${target.username}** hasn't written or received any public vows yet.`)
        );
      }

      const lines = await Promise.all(
        vows.map(async (v) => {
          let fromName = "Unknown", toName = "Unknown";
          try { fromName = (await interaction.client.users.fetch(v.fromUserId)).username; } catch {}
          try { toName   = (await interaction.client.users.fetch(v.toUserId)).username;   } catch {}
          const ts = Math.floor(new Date(v.updatedAt).getTime() / 1000);
          return `💍 **${fromName}** → **${toName}** • <t:${ts}:R>\n> *"${v.vow}"*`;
        })
      );

      return componentReply(interaction,
        infoContainer(
          `💍 ${target.username}'s vows`,
          lines.join("\n\n"),
          { color: config.colors.pink, thumbnailUrl: target.displayAvatarURL({ dynamic: true }) }
        )
      );
    }
  },
};
