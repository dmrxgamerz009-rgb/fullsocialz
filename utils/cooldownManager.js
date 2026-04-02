// src/utils/cooldownManager.js
// Thin wrapper around the Cooldown model for clean command-level usage

const Cooldown = require("../models/Cooldown");
const config = require("../config");

/**
 * Check and enforce a cooldown.
 * Returns { onCooldown: false } if clear,
 * or { onCooldown: true, remainingMs, formatted } if blocked.
 */
async function checkCooldown(userId, guildId, action) {
  if (!config.features.cooldowns) return { onCooldown: false };

  const remainingMs = await Cooldown.getRemainingMs(userId, guildId, action);
  if (remainingMs <= 0) return { onCooldown: false };

  return {
    onCooldown: true,
    remainingMs,
    formatted: Cooldown.formatTime(remainingMs),
  };
}

/**
 * Set a cooldown after a successful action.
 */
async function setCooldown(userId, guildId, action, durationMs) {
  if (!config.features.cooldowns) return;
  await Cooldown.set(userId, guildId, action, durationMs);
}

/**
 * Build a per-target cooldown key, e.g. "rep:userId123"
 */
function targetKey(command, targetUserId) {
  return `${command}:${targetUserId}`;
}

module.exports = { checkCooldown, setCooldown, targetKey };
