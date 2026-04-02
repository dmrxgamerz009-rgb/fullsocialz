// src/utils/animeInteraction.js
// Factory that generates all anime interaction commands from a single config.
// Each interaction: fetches a GIF from waifu.pics, tracks stats, renders container.

const { SlashCommandBuilder } = require("discord.js");
const axios = require("axios");
const User = require("../models/User");
const emojis = require("../emojis");
const config = require("../config");
const {
  animeContainer,
  errorContainer,
  componentReply,
  COMPONENTS_V2_FLAG,
} = require("./embedBuilder");

// ─── Interaction definitions ──────────────────────────────────────────────────
// endpoint: waifu.pics SFW category
// selfMessage: shown when /cmd is used with no target (or self)
// targetMessage: shown when targeting another user (supports {user} and {target})
// statKey: field name in User.social to increment (given/received)
// color: accent color int

const INTERACTIONS = {
  hug: {
    endpoint: "hug",
    emoji: emojis.anime.hug,
    color: config.colors.pink,
    selfMessage: (u) => `**${u}** needs a hug! 🤗`,
    targetMessage: (u, t) => `**${u}** gives **${t}** a warm hug! 🤗`,
    statGiven: "hugsGiven",
    statReceived: "hugsReceived",
  },
  pat: {
    endpoint: "pat",
    emoji: emojis.anime.pat,
    color: config.colors.pink,
    selfMessage: (u) => `**${u}** pats themselves. There, there. 🤚`,
    targetMessage: (u, t) => `**${u}** gently pats **${t}**! 🤚`,
    statGiven: "patsGiven",
    statReceived: "patsReceived",
  },
  kiss: {
    endpoint: "kiss",
    emoji: emojis.anime.kiss,
    color: config.colors.pink,
    selfMessage: (u) => `**${u}** kissed the air. Bold. 💋`,
    targetMessage: (u, t) => `**${u}** kisses **${t}**! 💋`,
    statGiven: "kissesGiven",
    statReceived: "kissesReceived",
  },
  slap: {
    endpoint: "slap",
    emoji: emojis.anime.slap,
    color: config.colors.error,
    selfMessage: (u) => `**${u}** slapped themselves. Are you okay? 👋`,
    targetMessage: (u, t) => `**${u}** slaps **${t}**! 👋 *Ouch!*`,
    statGiven: "slapsGiven",
    statReceived: "slapsReceived",
  },
  poke: {
    endpoint: "poke",
    emoji: emojis.anime.poke,
    color: config.colors.primary,
    selfMessage: (u) => `**${u}** pokes themselves curiously. 👉`,
    targetMessage: (u, t) => `**${u}** pokes **${t}**! 👉 *Hey!*`,
    statGiven: null,
    statReceived: null,
  },
  cuddle: {
    endpoint: "cuddle",
    emoji: emojis.anime.cuddle,
    color: config.colors.pink,
    selfMessage: (u) => `**${u}** cuddles a pillow. Cozy! 🥰`,
    targetMessage: (u, t) => `**${u}** cuddles up with **${t}**! 🥰`,
    statGiven: null,
    statReceived: null,
  },
  wave: {
    endpoint: "wave",
    emoji: emojis.anime.wave,
    color: config.colors.primary,
    selfMessage: (u) => `**${u}** waves at everyone! 👋`,
    targetMessage: (u, t) => `**${u}** waves at **${t}**! 👋`,
    statGiven: null,
    statReceived: null,
  },
  highfive: {
    endpoint: "highfive",
    emoji: emojis.anime.highfive,
    color: config.colors.success,
    selfMessage: (u) => `**${u}** high-fives the air. Nice. 🙌`,
    targetMessage: (u, t) => `**${u}** high-fives **${t}**! 🙌 *Yeah!*`,
    statGiven: null,
    statReceived: null,
  },
  bite: {
    endpoint: "bite",
    emoji: emojis.anime.bite,
    color: config.colors.error,
    selfMessage: (u) => `**${u}** bites their own arm. Weird flex. 😬`,
    targetMessage: (u, t) => `**${u}** bites **${t}**! 😬 *Ouch!*`,
    statGiven: null,
    statReceived: null,
  },
  lick: {
    endpoint: "lick",
    emoji: emojis.anime.lick,
    color: config.colors.purple,
    selfMessage: (u) => `**${u}** licks their lips. Okay then. 👅`,
    targetMessage: (u, t) => `**${u}** licks **${t}**! 👅 *weird!*`,
    statGiven: null,
    statReceived: null,
  },
  bonk: {
    endpoint: "bonk",
    emoji: emojis.anime.bonk,
    color: config.colors.warning,
    selfMessage: (u) => `**${u}** bonks themselves. Horny jail. 🔨`,
    targetMessage: (u, t) => `**${u}** bonks **${t}**! 🔨 *Go to horny jail!*`,
    statGiven: null,
    statReceived: null,
  },
  blush: {
    endpoint: "blush",
    emoji: emojis.anime.blush,
    color: config.colors.pink,
    selfMessage: (u) => `**${u}** is blushing! 😊`,
    targetMessage: (u, t) => `**${u}** is blushing because of **${t}**! 😊`,
    statGiven: null,
    statReceived: null,
  },
  cry: {
    endpoint: "cry",
    emoji: emojis.anime.cry,
    color: config.colors.info,
    selfMessage: (u) => `**${u}** is crying... 😢 Someone comfort them!`,
    targetMessage: (u, t) => `**${u}** is crying because of **${t}**! 😢`,
    statGiven: null,
    statReceived: null,
  },
  dance: {
    endpoint: "dance",
    emoji: emojis.anime.dance,
    color: config.colors.purple,
    selfMessage: (u) => `**${u}** is dancing! 💃 Join them!`,
    targetMessage: (u, t) => `**${u}** dances with **${t}**! 💃`,
    statGiven: null,
    statReceived: null,
  },
  nom: {
    endpoint: "nom",
    emoji: emojis.anime.nom,
    color: config.colors.warning,
    selfMessage: (u) => `**${u}** is nomming away! 😋`,
    targetMessage: (u, t) => `**${u}** noms on **${t}**! 😋`,
    statGiven: null,
    statReceived: null,
  },
};

// ─── GIF fetcher with fallback ────────────────────────────────────────────────
async function fetchGif(endpoint) {
  try {
    const res = await axios.get(`${config.anime.apiBaseUrl}/${endpoint}`, {
      timeout: 5000,
    });
    return res.data?.url ?? config.anime.fallbackGif;
  } catch {
    return config.anime.fallbackGif;
  }
}

// ─── Stat updater ─────────────────────────────────────────────────────────────
async function updateStats(giverId, guildId, targetId, def) {
  if (!def.statGiven && !def.statReceived) return;

  const updates = [];

  if (def.statGiven) {
    updates.push(
      User.findOneAndUpdate(
        { userId: giverId, guildId },
        { $inc: { [`social.${def.statGiven}`]: 1, "social.interactionsTotal": 1 } },
        { upsert: true }
      )
    );
  }

  if (def.statReceived && targetId && targetId !== giverId) {
    updates.push(
      User.findOneAndUpdate(
        { userId: targetId, guildId },
        { $inc: { [`social.${def.statReceived}`]: 1 } },
        { upsert: true }
      )
    );
  }

  // Always bump total for giver
  if (!def.statGiven) {
    updates.push(
      User.findOneAndUpdate(
        { userId: giverId, guildId },
        { $inc: { "social.interactionsTotal": 1 } },
        { upsert: true }
      )
    );
  }

  await Promise.all(updates);
}

// ─── Build a slash command from an interaction definition ─────────────────────
function buildInteractionCommand(name, def) {
  return {
    data: new SlashCommandBuilder()
      .setName(name)
      .setDescription(
        `${def.emoji} ${name.charAt(0).toUpperCase() + name.slice(1)} someone (or express yourself!)`
      )
      .addUserOption((o) =>
        o.setName("user").setDescription("Who to interact with (optional)")
      ),

    async execute(interaction) {
      const sender = interaction.user;
      const target = interaction.options.getUser("user");
      const guildId = interaction.guildId;

      const isSelf = !target || target.id === sender.id || target.bot;

      const message = isSelf
        ? def.selfMessage(sender.username)
        : def.targetMessage(sender.username, target.username);

      // Fetch GIF concurrently with stat update
      const [gifUrl] = await Promise.all([
        fetchGif(def.endpoint),
        updateStats(sender.id, guildId, isSelf ? null : target?.id, def),
      ]);

      // Build stat line for tracked interactions
      let statLine = "";
      if (def.statGiven) {
        const userData = await User.findOne({ userId: sender.id, guildId });
        const givenCount = userData?.social?.[def.statGiven] ?? 0;
        const receivedCount = userData?.social?.[def.statReceived] ?? 0;
        statLine = `\n-# ${def.emoji} You've given **${givenCount}** ${name}s and received **${receivedCount}**`;
      }

      const container = animeContainer(
        def.emoji,
        `${message}${statLine}`,
        gifUrl,
        { color: def.color }
      );

      // FIX: no content: field with Components v2 — target mention is in the message text
      await interaction.reply({
        components: [container],
        flags: COMPONENTS_V2_FLAG,
      });
    },
  };
}

module.exports = { INTERACTIONS, buildInteractionCommand, fetchGif };
