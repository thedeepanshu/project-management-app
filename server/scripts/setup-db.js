// Creates the collections and indexes the app relies on. Safe to re-run:
// existing collections are kept, app indexes are synced (stale ones dropped).
//   npm run db:setup

import mongoose from "mongoose";

import { connectDB, disconnectDB } from "../config/db.js";
import Client from "../models/Client.js";
import Project from "../models/Project.js";

// Better Auth's collections (MongoDB adapter, default names).
const AUTH_INDEXES = {
  user: [{ key: { email: 1 }, unique: true }],
  session: [
    { key: { token: 1 }, unique: true },
    { key: { userId: 1 } },
    { key: { expiresAt: 1 }, expireAfterSeconds: 0 }, // MongoDB removes expired sessions
  ],
  account: [{ key: { userId: 1 } }, { key: { providerId: 1, accountId: 1 } }],
  verification: [
    { key: { identifier: 1 } },
    { key: { expiresAt: 1 }, expireAfterSeconds: 0 }, // and expired verification/reset tokens
  ],
  rateLimit: [{ key: { key: 1 }, unique: true }],
};

await connectDB();

try {
  for (const Model of [Client, Project]) {
    await Model.createCollection();
    await Model.syncIndexes();
    const indexes = await Model.collection.indexes();
    console.log(`✔ ${Model.collection.name}: ${indexes.map((index) => index.name).join(", ")}`);
  }

  const db = mongoose.connection.db;
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
  for (const [name, indexes] of Object.entries(AUTH_INDEXES)) {
    if (!existing.has(name)) await db.createCollection(name);
    for (const { key, ...options } of indexes) await db.collection(name).createIndex(key, options);
    const names = (await db.collection(name).indexes()).map((index) => index.name);
    console.log(`✔ ${name}: ${names.join(", ")}`);
  }

  console.log(`Database "${mongoose.connection.name}" is ready.`);
} finally {
  await disconnectDB();
}
