// src/commands/social-extra/status.js
const { SlashCommandBuilder } = require("discord.js");
const SocialStatus = require("../../models/SocialStatus");
const emojis = require("../../emojis");
const config = require("../../config");
const {
  successContainer, errorContainer, infoContainer,
  componentReply, COMPONENTS_V2_FLAG,
} = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("Manage your social status 💬")
    .addSubcommand((sub) =>
      sub.setName("set")
        .setDescription("Set your status")
        .addStringOption((o) => o.setName("message").setDescription("Your status message").setRequired(true).setMaxLength(120))
        .addStringOption((o) => o.setName("mood").setDescription("A mood emoji (e.g. 😊 🔥 💤)").setMaxLength(10))
        .addBooleanOption((o) => o.setName("private").setDescription("Only you can see it? (default: public)"))
    )
    .addSubcommand((sub) =>
      sub.setName("view")
        .setDescription("View someone's status")
        .addUserOption((o) => o.setName("user").setDescription("User to view (defaults to yourself)"))
    )
    .addSubcommand((sub) =>
      sub.setName("clear").setDescription("Clear your current status")
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    if (sub === "set") {
      const message = interaction.options.getString("message");
      const mood    = interaction.options.getString("mood") ?? "💬";
      const priv    = interaction.options.getBoolean("private") ?? false;

      await SocialStatus.findOneAndUpdate(
        { userId, guildId },
        { status: message, mood, private: priv },
        { upsert: true, new: true }
      );

      return componentReply(interaction,
        successContainer(`${mood} Status updated!`, `Your status is now:\n> *"${message}"*\n\n${priv ? "🔒 Only you can see this." : "🌐 Visible to everyone."}`),
        { ephemeral: true }
      );
    }

    if (sub === "view") {
      const target = interaction.options.getUser("user") ?? interaction.user;
      const isSelf = target.id === userId;

      const statusDoc = await SocialStatus.findOne({ userId: target.id, guildId });

      if (!statusDoc?.status) {
        return componentReply(interaction,
          errorContainer("No status", `**${target.username}** hasn't set a status yet.`),
          { ephemeral: true }
        );
      }

      if (statusDoc.private && !isSelf) {
        return componentReply(interaction,
          errorContainer("Private status", `**${target.username}'s** status is private.`),
          { ephemeral: true }
        );
      }

      const ts = Math.floor(new Date(statusDoc.updatedAt).getTime() / 1000);

      return interaction.reply({
        components: [infoContainer(
          `${statusDoc.mood} ${target.username}'s status`,
          `> *"${statusDoc.status}"*`,
          {
            color: config.colors.primary,
            fields: [{ name: "Last updated", value: `<t:${ts}:R>` }],
            thumbnailUrl: target.displayAvatarURL({ dynamic: true }),
          }
        )],
        flags: COMPONENTS_V2_FLAG,
      });
    }

    if (sub === "clear") {
      await SocialStatus.findOneAndUpdate(
        { userId, guildId },
        { status: null },
        { upsert: true }
      );
      return componentReply(interaction,
        successContainer("Status cleared", "Your status has been removed."),
        { ephemeral: true }
      );
    }
  },
};
