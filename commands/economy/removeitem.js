// src/commands/economy/removeitem.js
const { SlashCommandBuilder, PermissionFlagsBits, ComponentType } = require("discord.js");
const ShopItem = require("../../models/ShopItem");
const config = require("../../config");
const {
  proposalContainer,
  successContainer,
  errorContainer,
  componentReply,
  COMPONENTS_V2_FLAG,
} = require("../../utils/embedBuilder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("removeitem")
    .setDescription("Remove a custom item from the shop 🗑️ (Admin only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) =>
      o.setName("id").setDescription("Item ID to remove").setRequired(true)
    )
    .addBooleanOption((o) =>
      o.setName("permanent").setDescription("Permanently delete? (default: just deactivate/hide)")
    ),

  async execute(interaction) {
    const guildId   = interaction.guildId;
    const itemId    = interaction.options.getString("id").toLowerCase().trim();
    const permanent = interaction.options.getBoolean("permanent") ?? false;

    const shopItem = await ShopItem.findOne({ guildId, itemId });
    if (!shopItem) {
      return componentReply(interaction,
        errorContainer("Not found", `No item with ID \`${itemId}\` found in this server's shop.`),
        { ephemeral: true }
      );
    }

    if (!shopItem.custom) {
      return componentReply(interaction,
        errorContainer("Can't remove", `**${shopItem.name}** is a default system item and cannot be removed.`),
        { ephemeral: true }
      );
    }

    const confirmId = `removeitem:confirm:${interaction.user.id}:${itemId}`;
    const cancelId  = `removeitem:cancel:${interaction.user.id}`;

    const action = permanent ? "permanently delete" : "deactivate (hide)";

    await componentReply(interaction,
      proposalContainer(
        `🗑️ Remove ${shopItem.name}?`,
        `Are you sure you want to **${action}** \`${itemId}\`?\n\n${permanent ? "⚠️ This cannot be undone — the item will be gone forever." : "The item will be hidden from the shop but not deleted."}`,
        confirmId,
        cancelId
      )
    );

    const reply = await interaction.fetchReply();
    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === interaction.user.id,
      time: 30_000,
      max: 1,
    });

    collector.on("collect", async (i) => {
      if (i.customId === confirmId) {
        if (permanent) {
          await shopItem.deleteOne();
        } else {
          shopItem.active = false;
          await shopItem.save();
        }

        await i.update({
          components: [successContainer(
            `🗑️ Item ${permanent ? "deleted" : "deactivated"}`,
            `**${shopItem.name}** (\`${itemId}\`) has been ${permanent ? "permanently removed" : "hidden from the shop"}.`
          )],
          flags: COMPONENTS_V2_FLAG,
        });
      } else {
        await i.update({
          components: [successContainer("Cancelled", `**${shopItem.name}** was not removed.`)],
          flags: COMPONENTS_V2_FLAG,
        });
      }
    });

    collector.on("end", async (collected) => {
      if (collected.size === 0) {
        await interaction.editReply({
          components: [errorContainer("Timed out", "Remove request expired.")],
          flags: COMPONENTS_V2_FLAG,
        });
      }
    });
  },
};
