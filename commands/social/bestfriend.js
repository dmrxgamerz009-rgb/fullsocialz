// src/commands/social/bestfriend.js
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

const MAX_BEST_FRIENDS = 5;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bestfriend")
    .setDescription("Manage your best friends list 👥")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Add someone as a best friend")
        .addUserOption((o) =>
          o.setName("user").setDescription("Your best friend").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("View your best friends")
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove a best friend")
        .addUserOption((o) =>
          o.setName("user").setDescription("Friend to remove").setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    const userData = await User.findOneAndUpdate(
      { userId, guildId },
      { username: interaction.user.username },
      { upsert: true, new: true }
    );

    const bestFriends = userData.bestFriends ?? [];

    if (sub === "add") {
      const target = interaction.options.getUser("user");

      if (target.id === userId) return componentReply(interaction, errorContainer("Hmm!", "You can't add yourself!"), { ephemeral: true });
      if (target.bot) return componentReply(interaction, errorContainer("Nope!", "Bots can't be best friends."), { ephemeral: true });

      if (bestFriends.includes(target.id)) {
        return componentReply(interaction, errorContainer("Already added!", `**${target.username}** is already your best friend!`), { ephemeral: true });
      }
      if (bestFriends.length >= MAX_BEST_FRIENDS) {
        return componentReply(interaction, errorContainer("List full!", `You can only have up to **${MAX_BEST_FRIENDS}** best friends.`), { ephemeral: true });
      }

      await User.findOneAndUpdate(
        { userId, guildId },
        { $addToSet: { bestFriends: target.id } }
      );

      return componentReply(
        interaction,
        successContainer(`${emojis.profile.friends} Best friend added!`, `**${target.username}** is now one of your best friends! ${emojis.ui.sparkles}`)
      );
    }

    if (sub === "remove") {
      const target = interaction.options.getUser("user");
      if (!bestFriends.includes(target.id)) {
        return componentReply(interaction, errorContainer("Not in list", `**${target.username}** is not in your best friends list.`), { ephemeral: true });
      }

      await User.findOneAndUpdate(
        { userId, guildId },
        { $pull: { bestFriends: target.id } }
      );

      return componentReply(
        interaction,
        successContainer(`${emojis.profile.friends} Removed`, `**${target.username}** has been removed from your best friends list.`)
      );
    }

    if (sub === "list") {
      if (bestFriends.length === 0) {
        return componentReply(
          interaction,
          infoContainer(`${emojis.profile.friends} No best friends yet`, "Use `/bestfriend add` to add someone!", { color: config.colors.pink }),
          { ephemeral: true }
        );
      }

      const lines = await Promise.all(
        bestFriends.map(async (id, i) => {
          try {
            const u = await interaction.client.users.fetch(id);
            return `${emojis.numbers[i + 1] ?? "•"} **${u.username}**`;
          } catch {
            return `• Unknown`;
          }
        })
      );

      return componentReply(
        interaction,
        infoContainer(
          `${emojis.profile.friends} ${interaction.user.username}'s best friends`,
          lines.join("\n"),
          { color: config.colors.pink, thumbnailUrl: interaction.user.displayAvatarURL({ dynamic: true }) }
        )
      );
    }
  },
};
