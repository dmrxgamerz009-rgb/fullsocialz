// src/commands/community/poll.js
const { SlashCommandBuilder, ComponentType, ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, SeparatorSpacingSize, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const Achievement = require("../../models/Achievement");
const { checkAndUnlock } = require("../../utils/achievementHelper");
const config = require("../../config");
const { infoContainer, successContainer, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Create a quick community poll 📊")
    .addStringOption((o) => o.setName("question").setDescription("The poll question").setRequired(true).setMaxLength(150))
    .addStringOption((o) => o.setName("option1").setDescription("Option 1").setRequired(true).setMaxLength(50))
    .addStringOption((o) => o.setName("option2").setDescription("Option 2").setRequired(true).setMaxLength(50))
    .addStringOption((o) => o.setName("option3").setDescription("Option 3 (optional)").setMaxLength(50))
    .addStringOption((o) => o.setName("option4").setDescription("Option 4 (optional)").setMaxLength(50))
    .addIntegerOption((o) =>
      o.setName("duration").setDescription("Poll duration in minutes (default: 5)").setMinValue(1).setMaxValue(60)
    ),

  async execute(interaction) {
    const question = interaction.options.getString("question");
    const opts     = [
      interaction.options.getString("option1"),
      interaction.options.getString("option2"),
      interaction.options.getString("option3"),
      interaction.options.getString("option4"),
    ].filter(Boolean);
    const duration = interaction.options.getInteger("duration") ?? 5;
    const guildId  = interaction.guildId;
    const userId   = interaction.user.id;

    const EMOJIS = ["🅰️","🅱️","🅾️","🆗"];
    const votes  = Object.fromEntries(opts.map((_, i) => [i, new Set()]));

    const buildContainer = (ended = false) => {
      const container = new ContainerBuilder().setAccentColor(config.colors.primary);
      const total = Object.values(votes).reduce((s, v) => s + v.size, 0);

      const lines = opts.map((opt, i) => {
        const count = votes[i].size;
        const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
        const bar   = "█".repeat(Math.round(pct / 10)).padEnd(10, "░");
        return `${EMOJIS[i]} **${opt}**\n[${bar}] ${count} vote(s) (${pct}%)`;
      }).join("\n\n");

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## 📊 ${question}\n\n${lines}\n\n${ended ? `-# Poll ended • Total votes: **${total}**` : `-# Created by **${interaction.user.username}** • Ends in ${duration}min • Total: **${total}** vote(s)`}`
        )
      );

      if (!ended) {
        // Buttons in rows of 2
        const chunks = [];
        for (let i = 0; i < opts.length; i += 2) chunks.push(opts.slice(i, i + 2).map((_, j) => i + j));
        for (const chunk of chunks) {
          container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
          container.addActionRowComponents(
            new ActionRowBuilder().addComponents(
              ...chunk.map((idx) =>
                new ButtonBuilder()
                  .setCustomId(`poll:${idx}:${interaction.id}`)
                  .setLabel(`${EMOJIS[idx]} ${opts[idx]}`)
                  .setStyle(ButtonStyle.Primary)
              )
            )
          );
        }
      }

      return container;
    };

    await interaction.reply({ components: [buildContainer()], flags: COMPONENTS_V2_FLAG });
    const reply = await interaction.fetchReply();

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => i.customId.endsWith(`:${interaction.id}`),
      time: duration * 60_000,
    });

    collector.on("collect", async (i) => {
      const optIdx = parseInt(i.customId.split(":")[1]);
      // Remove user's previous vote
      Object.values(votes).forEach((s) => s.delete(i.user.id));
      votes[optIdx].add(i.user.id);
      await i.update({ components: [buildContainer()], flags: COMPONENTS_V2_FLAG });
    });

    collector.on("end", async () => {
      await interaction.editReply({ components: [buildContainer(true)], flags: COMPONENTS_V2_FLAG });

      // Track polls created for achievement
      const doc = await Achievement.findOrCreate(userId, guildId);
      doc.pollsCreated = (doc.pollsCreated ?? 0) + 1;
      await doc.save();
      if (doc.pollsCreated >= 5) {
        await checkAndUnlock(interaction, userId, guildId, ["poll_creator"]);
      }
    });
  },
};
