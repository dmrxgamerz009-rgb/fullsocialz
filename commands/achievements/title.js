// src/commands/achievements/title.js
const { SlashCommandBuilder } = require("discord.js");
const Achievement = require("../../models/Achievement");
const { ACHIEVEMENTS } = require("../../models/Achievement");
const { successContainer, errorContainer, infoContainer, componentReply, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

// Map achievement IDs to their title strings
const TITLES = {
  first_marriage:  "Just Married 💍",
  anniversary_365: "Anniversary Legend 🎉",
  coins_50000:     "Whale 🐋",
  daily_30:        "Streak Master 🌟",
  rep_100:         "Legendary ⭐",
  trivia_50:       "Trivia Master 🏆",
  rps_streak_5:    "Unbeatable ✊",
  lottery_win:     "Lucky Winner 🎟️",
  hug_50:          "Hug Machine 🫂",
  big_family:      "Full House 🏡",
  appreciated:     "Cherished 🌸",
  spotlighted:     "In the Spotlight ✨",
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("title")
    .setDescription("Set or clear your profile title 👑")
    .addSubcommand((sub) =>
      sub.setName("set").setDescription("Choose a title from your earned achievements")
        .addStringOption((o) => o.setName("achievement").setDescription("Achievement ID (from /badges)").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName("clear").setDescription("Remove your active title")
    )
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("See all titles you can set")
    ),

  async execute(interaction) {
    const sub     = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const userId  = interaction.user.id;

    const doc = await Achievement.findOrCreate(userId, guildId);
    const unlockedIds = new Set(doc.unlocked.map((u) => u.achievementId));

    if (sub === "list") {
      const available = Object.entries(TITLES)
        .map(([id, title]) => `${unlockedIds.has(id) ? "✅" : "⬜"} \`${id}\` → **${title}**`)
        .join("\n");
      return componentReply(interaction,
        infoContainer("👑 Available titles", `Use \`/title set <achievement_id>\` to equip one.\n\n${available}`, { color: 0xfaa61a }),
        { ephemeral: true }
      );
    }

    if (sub === "clear") {
      doc.activeTitle = null;
      await doc.save();
      return componentReply(interaction,
        successContainer("👑 Title cleared", "Your title has been removed from your profile."),
        { ephemeral: true }
      );
    }

    if (sub === "set") {
      const achId = interaction.options.getString("achievement").toLowerCase().trim();
      if (!unlockedIds.has(achId)) {
        return componentReply(interaction,
          errorContainer("Not unlocked", `You haven't earned the **${achId}** achievement yet. Check \`/badges\` for what's available.`),
          { ephemeral: true }
        );
      }
      const title = TITLES[achId];
      if (!title) {
        return componentReply(interaction,
          errorContainer("No title", `That achievement doesn't have a title. Try \`/title list\` to see which ones do.`),
          { ephemeral: true }
        );
      }
      doc.activeTitle = title;
      await doc.save();
      return componentReply(interaction,
        successContainer("👑 Title set!", `Your new title is **${title}**. It'll show on your \`/profile\` and \`/lookup\`.`),
        { ephemeral: true }
      );
    }
  },
};
