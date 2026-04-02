// src/models/ShopItem.js
const mongoose = require("mongoose");

const shopItemSchema = new mongoose.Schema(
  {
    guildId:     { type: String, required: true, index: true },
    itemId:      { type: String, required: true },       // slug e.g. "vip_role"
    name:        { type: String, required: true, maxlength: 50 },
    description: { type: String, default: "A shop item.", maxlength: 150 },
    emoji:       { type: String, default: "🎁", maxlength: 10 },
    price:       { type: Number, required: true, min: 0 },

    // stock: -1 = unlimited (default items), >= 0 = limited (custom items)
    stock:       { type: Number, default: -1 },

    // max a single user can own at once (-1 = unlimited)
    maxPerUser:  { type: Number, default: -1 },

    roleId:      { type: String, default: null }, // grants this role on purchase
    active:      { type: Boolean, default: true },

    // custom = true means it was added by an admin via /additem
    // custom = false means it's a default system item
    custom:      { type: Boolean, default: false },

    // who added it (for audit)
    createdBy:   { type: String, default: null },
  },
  { timestamps: true }
);

shopItemSchema.index({ guildId: 1, itemId: 1 }, { unique: true });

// Seed default system items on first /shop view
shopItemSchema.statics.seedDefaults = async function (guildId) {
  const existing = await this.countDocuments({ guildId });
  if (existing > 0) return;

  await this.insertMany([
    { guildId, itemId: "lucky_charm", name: "Lucky Charm",  emoji: "🍀", price: 50,  stock: -1, custom: false, description: "Doubles your next /daily reward." },
    { guildId, itemId: "heart_badge", name: "Heart Badge",  emoji: "💖", price: 100, stock: -1, custom: false, description: "A badge of love for your profile." },
    { guildId, itemId: "crown",       name: "Crown",        emoji: "👑", price: 250, stock: -1, custom: false, description: "Royalty status. Show it off." },
    { guildId, itemId: "mystery_box", name: "Mystery Box",  emoji: "🎁", price: 75,  stock: -1, custom: false, description: "Contains a random coin reward (10–200)." },
    { guildId, itemId: "shield",      name: "Rob Shield",   emoji: "🛡️", price: 120, stock: -1, custom: false, description: "Protects you from /rob for 8 hours." },
    { guildId, itemId: "rep_booster",     name: "Rep Booster",      emoji: "⭐", price: 200,  stock: -1, custom: false, description: "Next rep you give awards +3 pts instead of +1." },
    { guildId, itemId: "bank_pass",        name: "Bank Pass",        emoji: "💼", price: 500,  stock: -1, custom: false, description: "Raises your coin cap from 10,000 to 50,000." },
    { guildId, itemId: "lottery_ticket",   name: "Lottery Ticket",   emoji: "🎟️", price: 50,   stock: -1, custom: false, description: "Enter the daily /lottery draw for a chance at the jackpot." },
    { guildId, itemId: "snack",            name: "Snack",            emoji: "🍫", price: 30,   stock: -1, custom: false, description: "Use on someone to give them +15 coins as a treat." },
    { guildId, itemId: "red_envelope",     name: "Red Envelope",     emoji: "🧧", price: 80,   stock: -1, custom: false, description: "Use on someone to send them 50–150 random coins." },
    { guildId, itemId: "wish",             name: "Wish",             emoji: "🪄", price: 300,  stock: -1, custom: false, description: "Instantly resets your /daily and /weekly cooldowns." },
    { guildId, itemId: "disguise_kit",     name: "Disguise Kit",     emoji: "🎭", price: 250,  stock: -1, custom: false, description: "Rob someone even if they have an active shield." },
    { guildId, itemId: "investors_brief",  name: "Investor's Brief", emoji: "📈", price: 150,  stock: -1, custom: false, description: "+50% coins on your next /work payout." },
    { guildId, itemId: "evil_eye",         name: "Evil Eye",         emoji: "🧿", price: 180,  stock: -1, custom: false, description: "Use on someone — they lose 5% of their coins (max 100)." },
    { guildId, itemId: "love_letter",      name: "Love Letter",      emoji: "💌", price: 120,  stock: -1, custom: false, description: "Use on your spouse — both of you gain +1 rep point." },
    { guildId, itemId: "trophy",           name: "Trophy",           emoji: "🏆", price: 1000, stock: -1, custom: false, description: "A prestigious cosmetic flex. Shows on your profile." },
  ]);
};

module.exports = mongoose.model("ShopItem", shopItemSchema);
