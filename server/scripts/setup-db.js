// Creates the collections and indexes the app relies on (e.g. unique client
// email). Safe to re-run: existing collections are kept, indexes are synced.
//   npm run db:setup

import mongoose from "mongoose";

import { connectDB, disconnectDB } from "../config/db.js";
import Client from "../models/Client.js";
import Project from "../models/Project.js";

await connectDB();

try {
  for (const Model of [Client, Project]) {
    await Model.createCollection();
    await Model.syncIndexes();
    const indexes = await Model.collection.indexes();
    console.log(`✔ ${Model.collection.name}: ${indexes.map((index) => index.name).join(", ")}`);
  }
  console.log(`Database "${mongoose.connection.name}" is ready.`);
} finally {
  await disconnectDB();
}
