// src/commands/community/vibes.js
const { SlashCommandBuilder } = require("discord.js");
const SocialStatus = require("../../models/SocialStatus");
const config = require("../../config");
const { successContainer, infoContainer, componentReply, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

const VIBES = [
  { emoji: "🔥", name: "On fire",       color: 0xE85D24 },
  { emoji: "😴", name: "Low energy",    color: 0x85B7EB },
  { emoji: "🥰", name: "Lovey dovey",   color: 0xFF6B9D },
  { emoji: "😤", name: "Determined",    color: 0xBA7517 },
  { emoji: "🌊", name: "Going with the flow", color: 0x1D9E75 },
  { emoji: "🌟", name: "Glowing up",    color: 0xFAC775 },
  { emoji: "💀", name: "Dead inside",   color: 0x444441 },
  { emoji: "✨", name: "Sparkling",     color: 0x7F77DD },
  { emoji: "🎮", name: "Gamer mode",    color: 0x378ADD },
  { emoji: "🍵", name: "Cozy",          color: 0x97C459 },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("vibes")
    .setDescription("Check or set your current vibe ✨")
    .addSubcommand((sub) =>
      sub.setName("set")
        .setDescription("Set your vibe")
        .addStringOption((o) => {
          const opt = o.setName("vibe").setDescription("Pick your vibe").setRequired(true);
          VIBES.forEach((v) => opt.addChoices({ name: `${v.emoji} ${v.name}`, value: v.emoji }));
          return opt;
        })
    )
    .addSubcommand((sub) =>
      sub.setName("check")
        .setDescription("Check someone's vibe")
        .addUserOption((o) => o.setName("user").setDescription("Whose vibe to check (defaults to yourself)"))
    ),

  async execute(interaction) {
    const sub     = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const userId  = interaction.user.id;

    if (sub === "set") {
      const vibeEmoji = interaction.options.getString("vibe");
      const vibe = VIBES.find((v) => v.emoji === vibeEmoji);

      await SocialStatus.findOneAndUpdate(
        { userId, guildId },
        { mood: vibe.emoji, status: vibe.name },
        { upsert: true }
      );

      return componentReply(interaction,
        successContainer(`${vibe.emoji} Vibe set!`, `Your current vibe: **${vibe.name}** ${vibe.emoji}`),
        { ephemeral: true }
      );
    }

    if (sub === "check") {
      const target = interaction.options.getUser("user") ?? interaction.user;
      const doc    = await SocialStatus.findOne({ userId: target.id, guildId });
      const vibe   = VIBES.find((v) => v.emoji === doc?.mood) ?? VIBES[7]; // default sparkles

      const vibeLabel = doc?.status ?? "No vibe set";
      const color     = vibe?.color ?? config.colors.primary;

      return interaction.reply({
        components: [infoContainer(
          `${vibe.emoji} ${target.username}'s vibe`,
          `Currently feeling: **${vibeLabel}** ${vibe.emoji}`,
          { color, thumbnailUrl: target.displayAvatarURL({ dynamic: true }) }
        )],
        flags: COMPONENTS_V2_FLAG,
      });
    }
  },
};
