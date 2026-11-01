import mongoose from "mongoose";
import { styleText } from "node:util";

import env from "./env.js";

export async function connectDB() {
  try {
    const conn = await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 10_000,
      // Serverless runs many small instances, each with its own pool; keep them
      // small so they stay well inside Atlas's connection limit.
      maxPoolSize: process.env.VERCEL ? 5 : 100,
    });
    console.log(styleText(["cyan", "bold"], `✔ MongoDB connected: ${conn.connection.host}`));
  } catch (error) {
    console.error(styleText("red", `✖ MongoDB connection failed: ${error.message}`));
    console.error(
      "  Check MONGO_URI in .env, your database user's password, and that your IP\n" +
        "  is allowed under Atlas → Security → Network Access."
    );
    // A Vercel Function retries on the next request; a local server just stops.
    if (process.env.VERCEL) throw error;
    process.exit(1);
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
