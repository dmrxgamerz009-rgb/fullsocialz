// src/commands/community/serverstats.js
const { SlashCommandBuilder } = require("discord.js");
const Marriage  = require("../../models/Marriage");
const Family    = require("../../models/Family");
const Reputation = require("../../models/Reputation");
const Wallet    = require("../../models/Wallet");
const User      = require("../../models/User");
const Achievement = require("../../models/Achievement");
const config    = require("../../config");
const { infoContainer, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("serverstats")
    .setDescription("View fun social statistics for this server 📊"),

  async execute(interaction) {
    await interaction.deferReply();
    const guildId = interaction.guildId;

    const [
      marriages, families, topRep, topCoins, totalUsers, totalAch,
    ] = await Promise.all([
      Marriage.countDocuments({ guildId, active: true }),
      Family.countDocuments({ guildId, active: true }),
      Reputation.findOne({ guildId }).sort({ points: -1 }).lean(),
      Wallet.findOne({ guildId }).sort({ coins: -1 }).lean(),
      User.countDocuments({ guildId }),
      Achievement.aggregate([{ $match: { guildId } }, { $project: { count: { $size: "$unlocked" } } }, { $group: { _id: null, total: { $sum: "$count" } } }]),
    ]);

    const totalAchCount = totalAch[0]?.total ?? 0;

    // Most hugged person
    const mostHugged = await User.findOne({ guildId }).sort({ "social.hugsReceived": -1 }).lean();
    const mostHuggedName = mostHugged
      ? (await interaction.client.users.fetch(mostHugged.userId).then((u) => u.username).catch(() => "Unknown"))
      : "Nobody";

    let topRepName = "Nobody", topCoinsName = "Nobody";
    if (topRep)   { try { topRepName   = (await interaction.client.users.fetch(topRep.userId)).username;   } catch {} }
    if (topCoins) { try { topCoinsName = (await interaction.client.users.fetch(topCoins.userId)).username; } catch {} }

    const fields = [
      { name: "💍 Active marriages",   value: `**${marriages}**` },
      { name: "👨‍👩‍👧 Family bonds",      value: `**${families}**` },
      { name: "👤 Registered members", value: `**${totalUsers}**` },
      { name: "🏆 Achievements earned",value: `**${totalAchCount}** total` },
      { name: "⭐ Most reputable",      value: `**${topRepName}** (${topRep?.points ?? 0} pts)` },
      { name: `${config.economy.currencyEmoji} Richest member`, value: `**${topCoinsName}** (${topCoins?.coins?.toLocaleString() ?? 0} coins)` },
      { name: "🤗 Most hugged",         value: `**${mostHuggedName}** (${mostHugged?.social?.hugsReceived ?? 0} hugs)` },
    ];

    await interaction.editReply({
      components: [infoContainer(
        `📊 ${interaction.guild.name} server stats`,
        "A snapshot of your community's social activity.",
        { color: config.colors.primary, fields, thumbnailUrl: interaction.guild.iconURL({ dynamic: true }) }
      )],
      flags: COMPONENTS_V2_FLAG,
    });
  },
};
