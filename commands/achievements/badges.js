// src/commands/achievements/badges.js
const { SlashCommandBuilder } = require("discord.js");
const Achievement = require("../../models/Achievement");
const { ACHIEVEMENTS } = require("../../models/Achievement");
const config = require("../../config");
const { infoContainer, componentReply, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("badges")
    .setDescription("See all achievements and which ones you've earned ✅"),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId  = interaction.user.id;

    const doc = await Achievement.findOrCreate(userId, guildId);
    const unlockedIds = new Set(doc.unlocked.map((u) => u.achievementId));

    const categories = {
      "💍 Social":     ["first_marriage","first_adopt","big_family","hug_10","hug_50","bestfriend_max","anniversary_30","anniversary_365"],
      "🪙 Economy":    ["coins_1000","coins_10000","coins_50000","daily_7","daily_30","lottery_win","first_rob"],
      "⭐ Reputation": ["rep_10","rep_50","rep_100","first_endorse","rep_giver_10"],
      "🎮 Games":      ["trivia_first","trivia_10","trivia_50","rps_streak_5"],
      "🌸 Community":  ["first_appreciate","appreciated","spotlighted","poll_creator"],
    };

    const fields = Object.entries(categories).map(([cat, ids]) => {
      const lines = ids.map((id) => {
        const ach = ACHIEVEMENTS[id];
        if (!ach) return null;
        const check = unlockedIds.has(id) ? "✅" : "⬜";
        return `${check} ${ach.emoji} **${ach.name}** — ${ach.desc}${ach.reward > 0 ? ` *(+${ach.reward}🪙)*` : ""}`;
      }).filter(Boolean);
      return { name: cat, value: lines.join("\n") };
    });

    const earned = unlockedIds.size;
    const total  = Object.keys(ACHIEVEMENTS).length;

    return interaction.reply({
      components: [infoContainer(
        "🏅 Achievement badge list",
        `You've earned **${earned}/${total}** badges. Keep going!`,
        { color: config.colors.gold, fields }
      )],
      flags: COMPONENTS_V2_FLAG,
    });
  },
};
