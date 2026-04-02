// src/utils/achievementHelper.js
// Central helper — call checkAndUnlock() anywhere to award achievements + reply with a banner.

const Achievement = require("../models/Achievement");
const Wallet      = require("../models/Wallet");
const {
  successContainer,
  COMPONENTS_V2_FLAG,
} = require("./embedBuilder");

/**
 * Attempt to unlock one or more achievements.
 * Sends an ephemeral congratulations message if any are newly unlocked.
 *
 * @param {Interaction} interaction - the Discord interaction
 * @param {string} userId
 * @param {string} guildId
 * @param {string|string[]} achievementIds - one or more achievement IDs to try
 */
async function checkAndUnlock(interaction, userId, guildId, achievementIds) {
  const ids = Array.isArray(achievementIds) ? achievementIds : [achievementIds];
  const newlyUnlocked = [];

  for (const id of ids) {
    const ach = await Achievement.unlock(userId, guildId, id);
    if (ach) newlyUnlocked.push({ id, ...ach });
  }

  if (newlyUnlocked.length === 0) return;

  // Award coins for each achievement
  const wallet = await Wallet.findOrCreate(userId, guildId);
  const totalReward = newlyUnlocked.reduce((sum, a) => sum + (a.reward ?? 0), 0);
  if (totalReward > 0) {
    wallet.addCoins(totalReward);
    await wallet.save();
  }

  // Build banner
  const lines = newlyUnlocked.map(
    (a) => `${a.emoji} **${a.name}** — ${a.desc}${a.reward > 0 ? ` *(+${a.reward} 🪙)*` : ""}`
  );

  const container = successContainer(
    "🏆 Achievement unlocked!",
    lines.join("\n"),
  );

  // Send as a follow-up so it doesn't break the main reply
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        components: [container],
        flags: COMPONENTS_V2_FLAG | (1 << 6), // ephemeral
      });
    } else {
      // Shouldn't normally happen but safe fallback
      await interaction.channel.send({
        components: [container],
        flags: COMPONENTS_V2_FLAG,
      });
    }
  } catch { /* silent — achievement notification is non-critical */ }
}

module.exports = { checkAndUnlock };
