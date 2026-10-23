import mongoose from "mongoose";
import { styleText } from "node:util";

import env from "./env.js";

export async function connectDB() {
  try {
    const conn = await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 10_000,
    });
    console.log(styleText(["cyan", "bold"], `✔ MongoDB connected: ${conn.connection.host}`));
  } catch (error) {
    console.error(styleText("red", `✖ MongoDB connection failed: ${error.message}`));
    console.error(
      "  Check MONGO_URI in .env, your database user's password, and that your IP\n" +
        "  is allowed under Atlas → Security → Network Access."
    );
    process.exit(1);
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
