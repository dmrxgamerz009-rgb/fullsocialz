// src/commands/social-extra/socialstats.js
const { SlashCommandBuilder } = require("discord.js");
const User = require("../../models/User");
const Family = require("../../models/Family");
const Marriage = require("../../models/Marriage");
const emojis = require("../../emojis");
const config = require("../../config");
const { infoContainer, componentReply, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("socialstats")
    .setDescription("View detailed social interaction stats 📊")
    .addUserOption((o) => o.setName("user").setDescription("User to inspect (defaults to yourself)")),

  async execute(interaction) {
    const target = interaction.options.getUser("user") ?? interaction.user;
    const guildId = interaction.guildId;

    const [userData, marriage, snap] = await Promise.all([
      User.findOrCreate(target.id, guildId, { username: target.username }),
      Marriage.findActiveMarriage(target.id, guildId),
      Family.getFamilySnapshot(target.id, guildId),
    ]);

    const s = userData.social ?? {};

    const fields = [
      { name: `${emojis.anime.hug} Hugs`, value: `Given: **${s.hugsGiven ?? 0}**  •  Received: **${s.hugsReceived ?? 0}**` },
      { name: `${emojis.anime.pat} Pats`, value: `Given: **${s.patsGiven ?? 0}**  •  Received: **${s.patsReceived ?? 0}**` },
      { name: `${emojis.anime.kiss} Kisses`, value: `Given: **${s.kissesGiven ?? 0}**  •  Received: **${s.kissesReceived ?? 0}**` },
      { name: `${emojis.anime.slap} Slaps`, value: `Given: **${s.slapsGiven ?? 0}**  •  Received: **${s.slapsReceived ?? 0}**` },
      { name: `${emojis.ui.sparkles} Total interactions`, value: `**${s.interactionsTotal ?? 0}**` },
      { name: `${emojis.family.parent} Family`, value: `${snap.children.length} child(ren)  •  ${snap.parent ? "Has parent" : "No parent"}` },
      { name: `${emojis.marriage.ring} Marital status`, value: marriage ? `Married (${marriage.getDuration()}d)` : "Single" },
    ];

    return componentReply(interaction,
      infoContainer(
        `📊 ${target.username}'s social stats`,
        `Full interaction history for **${target.username}**.`,
        { color: config.colors.pink, fields, thumbnailUrl: target.displayAvatarURL({ dynamic: true }) }
      )
    );
  },
};
