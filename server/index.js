import cors from "cors";
import express from "express";
import { createYoga } from "graphql-yoga";
import mongoose from "mongoose";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { styleText } from "node:util";

import { connectDB, disconnectDB } from "./config/db.js";
import env from "./config/env.js";
import { createLoaders } from "./graphql/loaders.js";
import { schema } from "./graphql/schema.js";

const clientDist = fileURLToPath(new URL("../client/dist", import.meta.url));

const yoga = createYoga({
  schema,
  graphqlEndpoint: "/graphql",
  graphiql: !env.isProduction && { title: "Loomwork GraphQL" },
  landingPage: false,
  context: () => ({ loaders: createLoaders() }),
});

const app = express();

app.disable("x-powered-by");
app.use(cors({ origin: env.clientOrigins }));

app.get("/health", (_req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  res.status(dbReady ? 200 : 503).json({ status: dbReady ? "ok" : "degraded", db: dbReady });
});

app.use(yoga.graphqlEndpoint, yoga);

// In production, the API also serves the built React app (single deployable).
if (env.isProduction && existsSync(clientDist)) {
  app.use(express.static(clientDist, { maxAge: "1y", index: false }));
  app.get("/{*splat}", (_req, res) => res.sendFile("index.html", { root: clientDist }));
}

await connectDB();

const server = app.listen(env.port, () => {
  console.log(styleText("magenta", `✔ API ready at http://localhost:${env.port}/graphql`));
});

async function shutdown(signal) {
  console.log(`\n${signal} received — shutting down gracefully`);
  server.close();
  await disconnectDB();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
