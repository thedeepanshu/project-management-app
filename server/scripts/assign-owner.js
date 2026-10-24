// Gives every client and project that has no owner yet (data created before
// accounts existed) to one user. Run once after that user has signed up:
//   npm run db:assign-owner -- you@example.com

import mongoose from "mongoose";

import { connectDB, disconnectDB } from "../config/db.js";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: npm run db:assign-owner -- <email of an existing account>");
  process.exit(1);
}

await connectDB();

try {
  const db = mongoose.connection.db;
  const user = await db.collection("user").findOne({ email });
  if (!user) {
    console.error(`✖ No account with the email ${email}. Sign up first, then run this again.`);
    process.exitCode = 1;
  } else {
    const ownerId = user._id.toString();
    const unowned = { $or: [{ ownerId: { $exists: false } }, { ownerId: null }] };
    const clients = await db.collection("clients").updateMany(unowned, { $set: { ownerId } });
    const projects = await db.collection("projects").updateMany(unowned, { $set: { ownerId } });
    console.log(`✔ Assigned ${clients.modifiedCount} clients and ${projects.modifiedCount} projects to ${email}.`);
  }
} finally {
  await disconnectDB();
}
