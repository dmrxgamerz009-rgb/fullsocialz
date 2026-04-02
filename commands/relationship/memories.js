// src/commands/relationship/memories.js
const { SlashCommandBuilder } = require("discord.js");
const mongoose = require("mongoose");
const config   = require("../../config");
const {
  successContainer, errorContainer, infoContainer,
  componentReply, COMPONENTS_V2_FLAG,
} = require("../../utils/embedBuilder");

// Lightweight inline model for memories
const memorySchema = new mongoose.Schema({
  guildId:   { type: String, required: true },
  authorId:  { type: String, required: true },
  withUserId:{ type: String, default: null },
  memory:    { type: String, required: true, maxlength: 300 },
  emoji:     { type: String, default: "💭", maxlength: 10 },
}, { timestamps: true });
memorySchema.index({ guildId: 1, authorId: 1 });
const Memory = mongoose.models.Memory || mongoose.model("Memory", memorySchema);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("memories")
    .setDescription("Save and revisit your favourite server memories 💭")
    .addSubcommand((sub) =>
      sub.setName("add")
        .setDescription("Save a new memory")
        .addStringOption((o) => o.setName("memory").setDescription("What's the memory?").setRequired(true).setMaxLength(300))
        .addUserOption((o) => o.setName("with").setDescription("Tag someone in this memory"))
        .addStringOption((o) => o.setName("emoji").setDescription("Emoji for this memory").setMaxLength(10))
    )
    .addSubcommand((sub) =>
      sub.setName("view")
        .setDescription("View your memories")
        .addUserOption((o) => o.setName("user").setDescription("View another user's memories"))
    )
    .addSubcommand((sub) =>
      sub.setName("shared")
        .setDescription("View memories shared between you and someone")
        .addUserOption((o) => o.setName("user").setDescription("The other person").setRequired(true))
    ),

  async execute(interaction) {
    const sub     = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const userId  = interaction.user.id;

    if (sub === "add") {
      const memText  = interaction.options.getString("memory");
      const withUser = interaction.options.getUser("with");
      const emoji    = interaction.options.getString("emoji") ?? "💭";

      const count = await Memory.countDocuments({ guildId, authorId: userId });
      if (count >= 25) {
        return componentReply(interaction,
          errorContainer("Memory full!", "You have 25 memories saved. Delete old ones to make room (use `/memories view`)."),
          { ephemeral: true }
        );
      }

      await Memory.create({
        guildId,
        authorId:   userId,
        withUserId: withUser?.id ?? null,
        memory:     memText,
        emoji,
      });

      const withLine = withUser ? ` with **${withUser.username}**` : "";
      return componentReply(interaction,
        successContainer(`${emoji} Memory saved!`, `Your memory${withLine} has been saved:\n\n> *"${memText}"*`),
        { ephemeral: true }
      );
    }

    if (sub === "view") {
      const target = interaction.options.getUser("user") ?? interaction.user;
      const memories = await Memory.find({ guildId, authorId: target.id })
        .sort({ createdAt: -1 }).limit(10).lean();

      if (memories.length === 0) {
        return componentReply(interaction,
          errorContainer("No memories", `**${target.username}** hasn't saved any memories yet.`)
        );
      }

      const lines = await Promise.all(memories.map(async (m) => {
        let withLine = "";
        if (m.withUserId) {
          try {
            const u = await interaction.client.users.fetch(m.withUserId);
            withLine = ` *with ${u.username}*`;
          } catch {}
        }
        const ts = Math.floor(new Date(m.createdAt).getTime() / 1000);
        return `${m.emoji} ${withLine} <t:${ts}:D>\n> *"${m.memory}"*`;
      }));

      return componentReply(interaction,
        infoContainer(
          `💭 ${target.username}'s memories`,
          lines.join("\n\n"),
          { color: config.colors.pink, thumbnailUrl: target.displayAvatarURL({ dynamic: true }) }
        )
      );
    }

    if (sub === "shared") {
      const other = interaction.options.getUser("user");
      const memories = await Memory.find({
        guildId,
        $or: [
          { authorId: userId,    withUserId: other.id },
          { authorId: other.id,  withUserId: userId   },
        ],
      }).sort({ createdAt: -1 }).limit(10).lean();

      if (memories.length === 0) {
        return componentReply(interaction,
          errorContainer("No shared memories", `You and **${other.username}** don't have any shared memories yet. Create some with \`/memories add\`!`)
        );
      }

      const lines = memories.map((m) => {
        const ts = Math.floor(new Date(m.createdAt).getTime() / 1000);
        return `${m.emoji} <t:${ts}:D>\n> *"${m.memory}"*`;
      });

      return componentReply(interaction,
        infoContainer(
          `💭 Memories: you & ${other.username}`,
          lines.join("\n\n"),
          { color: config.colors.pink }
        )
      );
    }
  },
};
