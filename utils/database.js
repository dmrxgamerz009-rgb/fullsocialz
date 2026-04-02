// src/utils/database.js
const mongoose = require("mongoose");

let isConnected = false;

async function connectDatabase() {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not defined in your .env file.");
  }

  try {
    await mongoose.connect(uri, {
      // Mongoose 8 uses these defaults; kept explicit for clarity
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log("[DB] Connected to MongoDB ✅");

    mongoose.connection.on("error", (err) => {
      console.error("[DB] MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("[DB] MongoDB disconnected. Attempting to reconnect...");
      isConnected = false;
    });

    mongoose.connection.on("reconnected", () => {
      console.log("[DB] MongoDB reconnected ✅");
      isConnected = true;
    });
  } catch (err) {
    console.error("[DB] Failed to connect to MongoDB:", err.message);
    process.exit(1);
  }
}

async function disconnectDatabase() {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  console.log("[DB] Disconnected from MongoDB.");
}

module.exports = { connectDatabase, disconnectDatabase };
