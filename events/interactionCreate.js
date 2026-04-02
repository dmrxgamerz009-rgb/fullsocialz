// src/events/interactionCreate.js
const { componentReply, errorContainer } = require("../utils/embedBuilder");
const config = require("../config");

module.exports = {
  name: "interactionCreate",
  once: false,

  async execute(interaction, client) {
    // ── Slash Commands ──────────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        console.warn(`[Commands] Unknown command: ${interaction.commandName}`);
        return;
      }

      try {
        if (config.features.logging) {
          console.log(
            `[Commands] /${interaction.commandName} used by ${interaction.user.tag} in ${interaction.guild?.name ?? "DM"}`
          );
        }

        await command.execute(interaction, client);
      } catch (err) {
        console.error(`[Commands] Error in /${interaction.commandName}:`, err);

        const errContainer = errorContainer(
          "Something went wrong",
          "An unexpected error occurred while processing your command. Please try again later."
        );

        try {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
              components: [errContainer],
              flags: (1 << 15) | (1 << 6), // Components v2 + ephemeral
            });
          } else {
            await interaction.reply({
              components: [errContainer],
              flags: (1 << 15) | (1 << 6),
            });
          }
        } catch (replyErr) {
          console.error("[Commands] Failed to send error reply:", replyErr);
        }
      }
    }

    // ── Button Interactions ─────────────────────────────────────────────────
    if (interaction.isButton()) {
      // Button handlers are registered per-command using collectors
      // This global handler catches unhandled buttons
      const [commandName] = interaction.customId.split(":");

      const command = client.commands.get(commandName);
      if (command?.handleButton) {
        try {
          await command.handleButton(interaction, client);
        } catch (err) {
          console.error(`[Button] Error in ${interaction.customId}:`, err);
        }
      }
    }
  },
};
