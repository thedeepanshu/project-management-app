import cors from "cors";
import express from "express";
import { createYoga } from "graphql-yoga";
import helmet from "helmet";
import mongoose from "mongoose";
import { toNodeHandler } from "better-auth/node";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { styleText } from "node:util";

import { CLIENT_IP_HEADER, enabledProviders, getSessionUser, initAuth } from "./auth/auth.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { runMigrations } from "./config/migrations.js";
import env from "./config/env.js";
import { createLoaders } from "./graphql/loaders.js";
import { schema } from "./graphql/schema.js";
import { useQueryProtection } from "./graphql/security.js";
import { api } from "./routes/api.js";
import { uploadsEnabled } from "./services/cloudinary.js";
import { emailMode, verifyEmailTransport } from "./services/mailer.js";

const clientDist = fileURLToPath(new URL("../client/dist", import.meta.url));

// Auth needs the database connection, so connect before building the app.
await connectDB();
await runMigrations();
const auth = initAuth();

const yoga = createYoga({
  schema,
  graphqlEndpoint: "/graphql",
  graphiql: !env.isProduction && { title: "Twillboard GraphQL", credentials: "same-origin" },
  landingPage: false,
  plugins: [useQueryProtection({ production: env.isProduction })],
  // Each request knows its user; resolvers refuse to run without one.
  context: async ({ req }) => {
    const user = await getSessionUser(req);
    return { user, loaders: createLoaders(user?.id) };
  },
});

const app = express();

app.disable("x-powered-by");
// Hosts like Render/Railway sit behind one proxy; trust it so rate limits see real client IPs.
if (env.isProduction) app.set("trust proxy", 1);

// Security headers. The Content-Security-Policy only allows our own scripts
// plus the few third parties the UI uses (fonts, Cloudinary files, the
// Office viewer). In development Vite serves the page, so CSP is off here.
app.use(
  helmet({
    contentSecurityPolicy: env.isProduction && {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        mediaSrc: ["'self'", "blob:", "https://res.cloudinary.com"],
        connectSrc: ["'self'", "https://api.cloudinary.com"],
        frameSrc: ["https://res.cloudinary.com", "https://view.officeapps.live.com"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    strictTransportSecurity: env.isProduction && { maxAge: 63_072_000, includeSubDomains: true, preload: true },
    crossOriginEmbedderPolicy: false, // client photos may come from any image host
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);
app.use(cors({ origin: env.clientOrigins, credentials: true }));

app.get("/health", (_req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  res.status(dbReady ? 200 : 503).json({ status: dbReady ? "ok" : "degraded", db: dbReady });
});

// The only client IP auth trusts: computed here, never taken from the client.
app.use((req, _res, next) => {
  req.headers[CLIENT_IP_HEADER] = req.ip ?? req.socket.remoteAddress ?? "unknown";
  next();
});

// Better Auth handles its own body parsing, so it's mounted before any JSON parser.
app.all("/api/auth/{*splat}", toNodeHandler(auth));

// GraphQL bodies are small; refuse anything large. express.json counts bytes
// as they arrive and stops at the limit, so this holds whether or not the
// request (or a proxy in front of us) sends Content-Length. Yoga then uses
// the parsed body instead of reading the stream again.
const parseGraphqlBody = express.json({ limit: "100kb" });
app.use(yoga.graphqlEndpoint, (req, res, next) =>
  parseGraphqlBody(req, res, (error) => {
    if (error?.type === "entity.too.large") return res.status(413).json({ errors: [{ message: "Request too large" }] });
    if (error) return res.status(400).json({ errors: [{ message: "Invalid JSON body" }] });
    next();
  })
);
app.use(yoga.graphqlEndpoint, yoga);
app.use("/api", api);

// In production, the API also serves the built React app (single deployable).
if (env.isProduction && existsSync(clientDist)) {
  app.use(express.static(clientDist, { maxAge: "1y", index: false }));
  app.get("/{*splat}", (_req, res) => res.sendFile("index.html", { root: clientDist }));
}

// Last resort: never leak stack traces.
app.use((error, _req, res, _next) => {
  console.error("Unhandled error:", error);
  if (!res.headersSent) res.status(500).json({ error: "Something went wrong" });
});

const server = app.listen(env.port, () => {
  console.log(styleText("magenta", `✔ API ready at http://localhost:${env.port}/graphql`));
  console.log(`✔ Auth: email + password${enabledProviders.length ? `, ${enabledProviders.join(", ")}` : " (no social providers configured)"}`);
  console.log(`✔ Email: ${emailMode}`);
  verifyEmailTransport();
  console.log(uploadsEnabled ? "✔ Uploads: Cloudinary" : "○ Uploads: off (set CLOUDINARY_URL to enable)");
});

async function shutdown(signal) {
  console.log(`\n${signal} received — shutting down gracefully`);
  server.close();
  await disconnectDB();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
