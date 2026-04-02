// src/commands/community/appreciate.js
const { SlashCommandBuilder } = require("discord.js");
const Appreciation = require("../../models/Appreciation");
const Achievement  = require("../../models/Achievement");
const { checkAndUnlock } = require("../../utils/achievementHelper");
const config = require("../../config");
const {
  successContainer, errorContainer, infoContainer,
  componentReply, COMPONENTS_V2_FLAG,
} = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("appreciate")
    .setDescription("Send a public appreciation to someone 💖")
    .addSubcommand((sub) =>
      sub.setName("send")
        .setDescription("Appreciate someone publicly")
        .addUserOption((o) => o.setName("user").setDescription("Who to appreciate").setRequired(true))
        .addStringOption((o) =>
          o.setName("message").setDescription("Your appreciation message").setRequired(true).setMaxLength(200)
        )
        .addBooleanOption((o) => o.setName("anonymous").setDescription("Send anonymously?"))
    )
    .addSubcommand((sub) =>
      sub.setName("wall")
        .setDescription("View the appreciation wall for a user")
        .addUserOption((o) => o.setName("user").setDescription("Whose wall to view (defaults to yourself)"))
    ),

  async execute(interaction) {
    const sub     = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const userId  = interaction.user.id;

    if (sub === "send") {
      const target    = interaction.options.getUser("user");
      const message   = interaction.options.getString("message");
      const anonymous = interaction.options.getBoolean("anonymous") ?? false;

      if (target.id === userId) {
        return componentReply(interaction,
          errorContainer("Hmm!", "Self-appreciation is healthy but this command is for others! 💕"),
          { ephemeral: true }
        );
      }
      if (target.bot) {
        return componentReply(interaction, errorContainer("Nope!", "Bots don't need appreciation."), { ephemeral: true });
      }

      await Appreciation.create({ guildId, fromUserId: userId, toUserId: target.id, message, anonymous });

      // Track sender's count for achievement
      const senderDoc = await Achievement.findOrCreate(userId, guildId);
      senderDoc.appreciationsSent = (senderDoc.appreciationsSent ?? 0) + 1;
      await senderDoc.save();

      // Track receiver's count for achievement
      const receiverDoc = await Achievement.findOrCreate(target.id, guildId);
      receiverDoc.appreciationsReceived = (receiverDoc.appreciationsReceived ?? 0) + 1;
      await receiverDoc.save();

      const fromDisplay = anonymous ? "Someone" : `**${interaction.user.username}**`;

      await interaction.reply({
        components: [successContainer(
          "💖 Appreciation sent!",
          `${fromDisplay} appreciates **${target.username}**!\n\n> 💌 *"${message}"*`,
          { thumbnailUrl: target.displayAvatarURL({ dynamic: true }) }
        )],
        flags: COMPONENTS_V2_FLAG,
      });

      // Achievement checks
      await checkAndUnlock(interaction, userId, guildId, ["first_appreciate"]);
      if (receiverDoc.appreciationsReceived >= 5) {
        await checkAndUnlock(interaction, target.id, guildId, ["appreciated"]);
      }
    }

    if (sub === "wall") {
      const target = interaction.options.getUser("user") ?? interaction.user;
      const posts  = await Appreciation.find({ guildId, toUserId: target.id })
        .sort({ createdAt: -1 }).limit(8).lean();

      if (posts.length === 0) {
        return componentReply(interaction,
          errorContainer("Empty wall", `**${target.username}** hasn't received any appreciations yet.\n\nBe the first with \`/appreciate send\`!`)
        );
      }

      const lines = await Promise.all(posts.map(async (p) => {
        let fromName = "Someone (anonymous)";
        if (!p.anonymous) {
          try { fromName = (await interaction.client.users.fetch(p.fromUserId)).username; } catch {}
        }
        const ts = Math.floor(new Date(p.createdAt).getTime() / 1000);
        return `💖 **${fromName}** • <t:${ts}:R>\n> *"${p.message}"*`;
      }));

      return componentReply(interaction,
        infoContainer(
          `💖 ${target.username}'s appreciation wall`,
          lines.join("\n\n"),
          { color: config.colors.pink, thumbnailUrl: target.displayAvatarURL({ dynamic: true }) }
        )
      );
    }
  },
};
