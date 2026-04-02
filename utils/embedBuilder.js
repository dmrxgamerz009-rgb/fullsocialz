// src/utils/embedBuilder.js
const {
  ContainerBuilder, SectionBuilder, TextDisplayBuilder, ThumbnailBuilder,
  SeparatorBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder,
  ButtonBuilder, ActionRowBuilder, ButtonStyle, SeparatorSpacingSize,
} = require("discord.js");
const config = require("../config");
const emojis = require("../emojis");

const COMPONENTS_V2_FLAG = 1 << 15;
const EPHEMERAL_FLAG = 1 << 6;

function _addHeader(container, text, thumbnailUrl) {
  if (thumbnailUrl) {
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text))
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnailUrl))
    );
  } else {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
  }
}

function _addFooter(container, text) {
  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
  );
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${text}`));
}

function successContainer(title, description, options = {}) {
  const { fields = [], thumbnailUrl = null, footer = true } = options;
  const container = new ContainerBuilder().setAccentColor(config.colors.success);
  _addHeader(container, `## ${emojis.status.success} ${title}\n${description}`, thumbnailUrl);
  if (fields.length > 0) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(fields.map((f) => `**${f.name}**\n${f.value}`).join("\n\n"))
    );
  }
  if (footer) _addFooter(container, `${emojis.ui.sparkles} ${config.embeds.footerText}`);
  return container;
}

function errorContainer(title, description, options = {}) {
  const { footer = true } = options;
  const container = new ContainerBuilder().setAccentColor(config.colors.error);
  _addHeader(container, `## ${emojis.status.error} ${title}\n${description}`, null);
  if (footer) _addFooter(container, config.embeds.footerText);
  return container;
}

function warningContainer(title, description) {
  const container = new ContainerBuilder().setAccentColor(config.colors.warning);
  _addHeader(container, `## ${emojis.status.warning} ${title}\n${description}`, null);
  return container;
}

function cooldownContainer(action, remainingMs, targetUser = null) {
  const remaining = formatTime(remainingMs);
  const desc = targetUser
    ? `You already gave **${action}** to **${targetUser}**! Try again in **${remaining}**.`
    : `You're on cooldown for **${action}**! Try again in **${remaining}**.`;
  return errorContainer(`${emojis.reputation.cooldown} Slow down!`, desc);
}

function proposalContainer(title, description, acceptId, declineId, thumbnailUrl = null) {
  const container = new ContainerBuilder().setAccentColor(config.colors.pink);
  _addHeader(container, `## ${title}\n${description}`, thumbnailUrl);
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
  container.addActionRowComponents(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(acceptId).setLabel("Accept").setEmoji({ name: "✅" }).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(declineId).setLabel("Decline").setEmoji({ name: "❌" }).setStyle(ButtonStyle.Danger)
    )
  );
  return container;
}

function infoContainer(title, description, options = {}) {
  const { color = config.colors.primary, fields = [], thumbnailUrl = null, footer = true } = options;
  const container = new ContainerBuilder().setAccentColor(color);
  _addHeader(container, `## ${title}\n${description}`, thumbnailUrl);
  if (fields.length > 0) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    for (const field of fields) {
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${field.name}**\n${field.value}`));
    }
  }
  if (footer) _addFooter(container, `${emojis.ui.sparkles} ${config.embeds.footerText}`);
  return container;
}

function animeContainer(emoji, message, gifUrl, options = {}) {
  const { color = config.colors.purple } = options;
  const container = new ContainerBuilder().setAccentColor(color);
  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji} ${message}`));
  if (gifUrl) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(gifUrl))
    );
  }
  _addFooter(container, config.embeds.footerText);
  return container;
}

function componentReply(interaction, container, options = {}) {
  const { ephemeral = false } = options;
  return interaction.reply({
    components: [container],
    flags: ephemeral ? COMPONENTS_V2_FLAG | EPHEMERAL_FLAG : COMPONENTS_V2_FLAG,
  });
}

function componentEdit(interaction, container) {
  return interaction.editReply({ components: [container], flags: COMPONENTS_V2_FLAG });
}

function formatTime(ms) {
  if (ms <= 0) return "now";
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (sec > 0 && h === 0) parts.push(`${sec}s`);
  return parts.join(" ");
}

module.exports = {
  COMPONENTS_V2_FLAG, EPHEMERAL_FLAG,
  successContainer, errorContainer, warningContainer, cooldownContainer,
  proposalContainer, infoContainer, animeContainer,
  componentReply, componentEdit, formatTime,
};