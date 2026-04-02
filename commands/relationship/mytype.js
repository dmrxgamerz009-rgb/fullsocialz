// src/commands/relationship/mytype.js
const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { infoContainer, componentReply, COMPONENTS_V2_FLAG } = require("../../utils/embedBuilder");

const TYPES = [
  { name: "The Loyal Protector",   emoji: "🛡️", traits: ["Deeply loyal","Protective","Steady","Prefers actions over words","Values trust above everything"] },
  { name: "The Free Spirit",       emoji: "🌊", traits: ["Spontaneous","Adventurous","Hates routine","Brings excitement","Emotionally open"] },
  { name: "The Gentle Nurturer",   emoji: "🌸", traits: ["Caring and warm","Puts others first","Loves deeply and quietly","Amazing listener","Feels everything intensely"] },
  { name: "The Witty Intellectual", emoji: "🧠", traits: ["Clever and curious","Loves deep conversations","Doesn't do shallow","Nerdy in the best way","Grows with you"] },
  { name: "The Bold Leader",       emoji: "🔥", traits: ["Confident","Driven","Protective energy","Knows what they want","Inspires you to be better"] },
  { name: "The Creative Soul",     emoji: "🎨", traits: ["Artistic","Imaginative","Sees the world differently","Sensitive","Makes life feel magical"] },
  { name: "The Calm Anchor",       emoji: "⚓", traits: ["Stable and grounding","Never dramatic","Makes you feel safe","Patient","Your home away from home"] },
  { name: "The Hidden Softie",     emoji: "🤍", traits: ["Tough on the outside","Melts for the right person","Slow to open up but fiercely devoted","Protects quietly","Worth the wait"] },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mytype")
    .setDescription("Discover your ideal type in a partner 💘")
    .addUserOption((o) => o.setName("user").setDescription("Check another user's type")),

  async execute(interaction) {
    const target = interaction.options.getUser("user") ?? interaction.user;
    const idx    = parseInt(target.id.slice(-6), 16) % TYPES.length;
    const type   = TYPES[idx];

    const traitList = type.traits.map((t) => `• ${t}`).join("\n");

    return interaction.reply({
      components: [infoContainer(
        `${type.emoji} ${target.username}'s ideal type`,
        `**${type.name}**\n\n${traitList}`,
        { color: config.colors.pink, thumbnailUrl: target.displayAvatarURL({ dynamic: true }) }
      )],
      flags: COMPONENTS_V2_FLAG,
    });
  },
};
