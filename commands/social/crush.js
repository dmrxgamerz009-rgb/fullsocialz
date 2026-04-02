// src/commands/social/crush.js
// Stores crushes in the User model's bio area — or we use a lightweight in-doc approach
// We store crush as a field in User model via a mixed update
const { SlashCommandBuilder } = require("discord.js");
const User = require("../../models/User");
const emojis = require("../../emojis");
const config = require("../../config");
const {
  successContainer,
  errorContainer,
  infoContainer,
  componentReply,
  COMPONENTS_V2_FLAG,
} = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("crush")
    .setDescription("Declare your secret crush 💘")
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Set your crush")
        .addUserOption((o) =>
          o.setName("user").setDescription("Your crush").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("view").setDescription("Reveal your current crush")
    )
    .addSubcommand((sub) =>
      sub.setName("clear").setDescription("Clear your current crush")
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    if (sub === "set") {
      const target = interaction.options.getUser("user");

      if (target.id === userId) {
        return componentReply(interaction, errorContainer("Hmm...", "Self-love is great, but you can't crush on yourself!"), { ephemeral: true });
      }
      if (target.bot) {
        return componentReply(interaction, errorContainer("Nope!", "Bots don't have feelings for you. 🤖"), { ephemeral: true });
      }

      await User.findOneAndUpdate(
        { userId, guildId },
        { $set: { "crushId": target.id }, username: interaction.user.username },
        { upsert: true }
      );

      return componentReply(
        interaction,
        successContainer(
          `${emojis.marriage.heart} Crush set!`,
          `You now have a secret crush on **${target.username}**! 💘\nOnly you can see this.`
        ),
        { ephemeral: true }
      );
    }

    if (sub === "view") {
      const userData = await User.findOne({ userId, guildId });
      if (!userData?.crushId) {
        return componentReply(interaction, errorContainer("No crush", "You haven't set a crush yet. Use `/crush set`!"), { ephemeral: true });
      }

      let crush;
      try {
        crush = await interaction.client.users.fetch(userData.crushId);
      } catch {
        crush = { username: "Unknown User" };
      }

      return componentReply(
        interaction,
        infoContainer(
          `${emojis.marriage.heart} Your crush`,
          `You have a secret crush on **${crush.username}**! 💘\n\n*Only you can see this.*`,
          { color: config.colors.pink }
        ),
        { ephemeral: true }
      );
    }

    if (sub === "clear") {
      await User.findOneAndUpdate(
        { userId, guildId },
        { $unset: { crushId: "" } },
        { upsert: true }
      );
      return componentReply(
        interaction,
        successContainer(`${emojis.marriage.divorce} Crush cleared`, "You've moved on. Plenty more fish in the sea! 🐟"),
        { ephemeral: true }
      );
    }
  },
};
