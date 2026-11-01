import Client from "../models/Client.js";

/**
 * Fixes for databases created by older versions, run at startup. Each one
 * checks before changing anything, so running them again is a no-op.
 */
export async function runMigrations() {
  // Client emails used to be unique across everyone; now they're unique per
  // owner ({ ownerId, email }). The old global index would stop a user adding
  // a client whose email another user already has, and the duplicate-email
  // error would reveal that it exists in someone else's data.
  const indexes = await Client.collection.indexes().catch(() => []); // no collection yet: nothing to fix
  if (indexes.some((index) => index.name === "email_1" && index.unique)) {
    await Client.collection.dropIndex("email_1");
    console.log("✔ Dropped the old global unique index on client emails (now unique per user)");
  }
}
