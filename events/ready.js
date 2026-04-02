// src/events/ready.js
const { ActivityType } = require("discord.js");
const config = require("../config");

module.exports = {
  name: "ready",
  once: true,

  execute(client) {
    console.log(`\n✅ ${client.user.tag} is online and ready!`);
    console.log(`   Guilds: ${client.guilds.cache.size}`);
    console.log(`   Commands: ${client.commands.size}`);

    // Set bot activity
    client.user.setPresence({
      activities: [
        {
          name: "the community 💕",
          type: ActivityType.Watching,
        },
      ],
      status: "online",
    });

    // Store bot avatar URL in config for use in embeds
    config.embeds.thumbnailUrl = client.user.displayAvatarURL({ dynamic: true });
  },
};
