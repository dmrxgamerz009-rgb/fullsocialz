// src/index.js
require("dotenv").config();

const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { connectDatabase } = require("./utils/database");
const config = require("./config");

// ─── Create Client ────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ─── Commands Collection ──────────────────────────────────────────────────────
client.commands = new Collection();
client.cooldowns = new Collection(); // In-memory cooldown cache (supplement to DB)

// ─── Load Commands ────────────────────────────────────────────────────────────
function loadCommands() {
  const commandsPath = path.join(__dirname, "commands");

  if (!fs.existsSync(commandsPath)) {
    console.log("[Commands] No commands folder found yet. Skipping load.");
    return;
  }

  const commandFolders = fs.readdirSync(commandsPath);

  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs
      .readdirSync(folderPath)
      .filter((f) => f.endsWith(".js"));

    for (const file of commandFiles) {
      const command = require(path.join(folderPath, file));

      if (!command.data || !command.execute) {
        console.warn(`[Commands] Skipping ${file} — missing data or execute export.`);
        continue;
      }

      client.commands.set(command.data.name, command);
      console.log(`[Commands] Loaded: /${command.data.name}`);
    }
  }
}

// ─── Load Events ─────────────────────────────────────────────────────────────
function loadEvents() {
  const eventsPath = path.join(__dirname, "events");

  if (!fs.existsSync(eventsPath)) {
    console.log("[Events] No events folder found yet. Skipping load.");
    return;
  }

  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((f) => f.endsWith(".js"));

  for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
    console.log(`[Events] Registered: ${event.name}`);
  }
}

// ─── Startup ──────────────────────────────────────────────────────────────────
async function start() {
  console.log(`\n🤖 Starting ${config.bot.name} v${config.bot.version}...`);

  // 1. Connect to MongoDB
  await connectDatabase();

  // 2. Load commands and events
  loadCommands();
  loadEvents();

  // 3. Login to Discord
  await client.login(process.env.DISCORD_TOKEN);
}

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
process.on("SIGINT", async () => {
  console.log("\n[Bot] Shutting down gracefully...");
  client.destroy();
  const { disconnectDatabase } = require("./utils/database");
  await disconnectDatabase();
  process.exit(0);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[Bot] Unhandled Rejection:", reason);
});

start().catch(console.error);

module.exports = client;
