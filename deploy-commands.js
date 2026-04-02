// src/deploy-commands.js
// Run with: node src/deploy-commands.js
// Deploys slash commands globally or to a specific guild (for dev)
require("dotenv").config();

const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const commands = [];
const commandsPath = path.join(__dirname, "commands");

if (!fs.existsSync(commandsPath)) {
  console.log("No commands folder found. Nothing to deploy.");
  process.exit(0);
}

// Collect all command data
const commandFolders = fs.readdirSync(commandsPath);
for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  const commandFiles = fs.readdirSync(folderPath).filter((f) => f.endsWith(".js"));

  for (const file of commandFiles) {
    const command = require(path.join(folderPath, file));
    if (command.data) {
      commands.push(command.data.toJSON());
      console.log(`Queued: /${command.data.name}`);
    }
  }
}

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

async function deploy() {
  try {
    console.log(`\nDeploying ${commands.length} slash commands...`);

    const guildId = process.env.GUILD_ID;

    if (guildId) {
      // Guild deploy (instant, for development)
      console.log(`Deploying to guild: ${guildId}`);
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
        { body: commands }
      );
      console.log(`✅ Guild commands deployed (instant)`);
    } else {
      // Global deploy (takes up to 1 hour to propagate)
      console.log("Deploying globally (may take up to 1 hour)...");
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );
      console.log("✅ Global commands deployed");
    }
  } catch (err) {
    console.error("❌ Deploy failed:", err);
    process.exit(1);
  }
}

deploy();
