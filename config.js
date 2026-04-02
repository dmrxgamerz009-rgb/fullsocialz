// src/config.js
// Central configuration file for SocialBot
// Edit these values to customize your bot's behavior

module.exports = {
  // ─── Bot Info ───────────────────────────────────────────────────────────────
  bot: {
    name: "SocialBot",
    version: "1.0.0",
    prefix: "/", // slash commands only, kept for reference
    supportServer: "https://discord.gg/your-server",
    inviteLink: "https://discord.com/oauth2/authorize?client_id=YOUR_ID&scope=bot+applications.commands",
  },

  // ─── Colors ─────────────────────────────────────────────────────────────────
  colors: {
    primary: 0x5865f2,    // Discord blurple
    success: 0x57f287,    // Green
    error: 0xed4245,      // Red
    warning: 0xfee75c,    // Yellow
    info: 0x5865f2,       // Blurple
    pink: 0xff6b9d,       // Social/romance
    gold: 0xfaa61a,       // Reputation/gold
    purple: 0x9b59b6,     // Anime interactions
    neutral: 0x2f3136,    // Dark neutral
    white: 0xffffff,
  },

  // ─── Social System Settings ──────────────────────────────────────────────────
  social: {
    // Marriage
    marriage: {
      proposalTimeout: 60_000,         // 60 seconds to accept/decline
      maxSpouses: 1,                   // Monogamy (change to higher for polygamy)
      ringCost: 0,                     // Currency cost (0 = free)
    },

    // Adoption
    adoption: {
      maxChildren: 10,                 // Max children a user can have
      requestTimeout: 60_000,         // 60 seconds to accept adoption
      minAgeDiff: 0,                  // Reserved for future use
    },

    // Profile
    profile: {
      defaultBio: "No bio set yet.",
      maxBioLength: 200,
    },
  },

  // ─── Reputation System Settings ─────────────────────────────────────────────
  reputation: {
    cooldowns: {
      rep: 2 * 60 * 60 * 1000,         // 2 hours per user in ms
      endorse: 24 * 60 * 60 * 1000,    // 24 hours per user in ms
    },
    pointsPerRep: 1,
    pointsPerEndorse: 2,
    maxEndorseLength: 150,            // Max endorsement message length
    leaderboardSize: 10,             // Users shown on /reputations
  },

  // ─── Anime Interactions ──────────────────────────────────────────────────────
  anime: {
    apiBaseUrl: "https://api.waifu.pics/sfw", // waifu.pics SFW API
    fallbackGif: "https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif",
    interactionCooldown: 3_000,       // 3 second cooldown between interactions
  },

  // ─── Embed Defaults ─────────────────────────────────────────────────────────
  embeds: {
    footerText: "SocialBot • Community first",
    thumbnailUrl: null,               // Bot avatar (auto-set on ready)
  },

  // ─── Permission Levels ──────────────────────────────────────────────────────
  permissions: {
    // Role IDs that can reset cooldowns, view admin stats, etc.
    adminRoles: [],
    // Whether guild owners automatically bypass cooldowns
    ownersBypassCooldowns: false,
  },

  // ─── Economy Settings ────────────────────────────────────────────────────────
  economy: {
    currencyName: "coins",
    currencyEmoji: "🪙",
    daily:   { base: 100, streakBonus: 10, maxStreak: 30, marriageBonus: 50, cooldownMs: 22 * 60 * 60 * 1000 },
    weekly:  { base: 500, cooldownMs: 6 * 24 * 60 * 60 * 1000 },
    work:    { min: 20, max: 80, cooldownMs: 1 * 60 * 60 * 1000 },
    rob:     { cooldownMs: 4 * 60 * 60 * 1000, protectionMs: 8 * 60 * 60 * 1000, successChance: 0.45, minVictimBalance: 50, maxSteal: 0.3 },
    gamble:  { minBet: 10, maxBet: 1000, cooldownMs: 30 * 1000 },
    coinflip:{ minBet: 5, maxBet: 500 },
    slots:   { minBet: 10, maxBet: 200, cooldownMs: 10 * 1000 },
    repReward: 5,
  },

  // ─── Feature Flags ──────────────────────────────────────────────────────────
  features: {
    socialSystem: true,
    reputationSystem: true,
    animeInteractions: true,
    economy: true,
    cooldowns: true,
    logging: true,
  },
};
