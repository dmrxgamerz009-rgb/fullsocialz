// src/commands/social-extra/diary.js
const { SlashCommandBuilder } = require("discord.js");
const Diary = require("../../models/Diary");
const emojis = require("../../emojis");
const config = require("../../config");
const {
  successContainer, errorContainer, infoContainer,
  componentReply, COMPONENTS_V2_FLAG,
} = require("../../utils/embedBuilder");

const MOODS = ["😊","😢","😡","😍","😴","🥳","😰","🤔","😎","🥺","💪","🌟"];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("diary")
    .setDescription("Your personal diary 📖")
    .addSubcommand((sub) =>
      sub.setName("write")
        .setDescription("Write a new diary entry")
        .addStringOption((o) => o.setName("title").setDescription("Entry title").setRequired(true).setMaxLength(80))
        .addStringOption((o) => o.setName("content").setDescription("What's on your mind?").setRequired(true).setMaxLength(1000))
        .addStringOption((o) => o.setName("mood").setDescription("Your mood emoji (e.g. 😊)").setMaxLength(10))
        .addBooleanOption((o) => o.setName("public").setDescription("Make this entry public? (default: private)"))
    )
    .addSubcommand((sub) =>
      sub.setName("read")
        .setDescription("Read your diary entries")
        .addUserOption((o) => o.setName("user").setDescription("Read another user's public entries"))
        .addIntegerOption((o) => o.setName("page").setDescription("Page number").setMinValue(1))
    )
    .addSubcommand((sub) =>
      sub.setName("delete")
        .setDescription("Delete a diary entry")
        .addStringOption((o) => o.setName("id").setDescription("Entry ID (shown in /diary read)").setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    // ── write ────────────────────────────────────────────────────────────────
    if (sub === "write") {
      const title   = interaction.options.getString("title");
      const content = interaction.options.getString("content");
      const mood    = interaction.options.getString("mood") ?? "📝";
      const isPublic = !(interaction.options.getBoolean("public") ?? false) ? true : false;
      // private by default, public only if explicitly set to true
      const privateEntry = !(interaction.options.getBoolean("public") === true);

      const count = await Diary.countDocuments({ userId, guildId });
      if (count >= 20) {
        return componentReply(interaction,
          errorContainer("Diary full!", "You can have up to **20** diary entries. Delete some old ones first."),
          { ephemeral: true }
        );
      }

      const entry = await Diary.create({ userId, guildId, title, content, mood, private: privateEntry });

      return componentReply(interaction,
        successContainer(
          `${mood} Diary entry saved!`,
          `**${title}**\n\n${content}\n\n-# Entry ID: \`${entry._id}\` • ${privateEntry ? "🔒 Private" : "🌐 Public"}`,
          { thumbnailUrl: interaction.user.displayAvatarURL({ dynamic: true }) }
        ),
        { ephemeral: true }
      );
    }

    // ── read ─────────────────────────────────────────────────────────────────
    if (sub === "read") {
      const target = interaction.options.getUser("user") ?? interaction.user;
      const isSelf = target.id === userId;
      const page   = (interaction.options.getInteger("page") ?? 1) - 1;
      const PAGE_SIZE = 3;

      const filter = isSelf
        ? { userId: target.id, guildId }
        : { userId: target.id, guildId, private: false };

      const [entries, total] = await Promise.all([
        Diary.find(filter).sort({ createdAt: -1 }).skip(page * PAGE_SIZE).limit(PAGE_SIZE).lean(),
        Diary.countDocuments(filter),
      ]);

      if (entries.length === 0) {
        return componentReply(interaction,
          errorContainer("No entries", isSelf ? "Your diary is empty. Write your first entry with `/diary write`!" : `**${target.username}** has no public diary entries.`),
          { ephemeral: true }
        );
      }

      const lines = entries.map((e) => {
        const ts = Math.floor(new Date(e.createdAt).getTime() / 1000);
        const lock = e.private ? "🔒" : "🌐";
        return `${e.mood} **${e.title}** ${lock} • <t:${ts}:R>\n> ${e.content.slice(0, 120)}${e.content.length > 120 ? "…" : ""}\n-# ID: \`${e._id}\``;
      });

      const totalPages = Math.ceil(total / PAGE_SIZE);

      return componentReply(interaction,
        infoContainer(
          `📖 ${target.username}'s diary`,
          lines.join("\n\n"),
          {
            color: config.colors.pink,
            fields: [{ name: "Page", value: `${page + 1} of ${totalPages}  •  ${total} total entries` }],
            thumbnailUrl: target.displayAvatarURL({ dynamic: true }),
          }
        ),
        { ephemeral: isSelf }
      );
    }

    // ── delete ───────────────────────────────────────────────────────────────
    if (sub === "delete") {
      const id = interaction.options.getString("id");
      let entry;
      try {
        entry = await Diary.findOne({ _id: id, userId, guildId });
      } catch {
        return componentReply(interaction, errorContainer("Invalid ID", "That entry ID doesn't look right."), { ephemeral: true });
      }

      if (!entry) {
        return componentReply(interaction, errorContainer("Not found", "That diary entry doesn't exist or isn't yours."), { ephemeral: true });
      }

      await entry.deleteOne();
      return componentReply(interaction,
        successContainer("Deleted", `Entry **"${entry.title}"** has been deleted from your diary.`),
        { ephemeral: true }
      );
    }
  },
};
