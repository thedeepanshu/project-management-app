// Centralised, validated environment config. Fails fast with a readable message
// instead of letting a missing variable surface later as a cryptic stack trace.

const nodeEnv = process.env.NODE_ENV ?? "development";

const env = {
  nodeEnv,
  isProduction: nodeEnv === "production",
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  // Comma-separated list of origins allowed to call the API cross-origin.
  // In development the Vite dev server proxies /graphql, so this is rarely needed.
  clientOrigins: (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  // cloudinary://<api_key>:<api_secret>@<cloud_name> — enables file uploads.
  cloudinaryUrl: process.env.CLOUDINARY_URL,
};

const missing = [];
if (!env.mongoUri) missing.push("MONGO_URI");

if (missing.length > 0) {
  console.error(
    `\n✖ Missing required environment variable(s): ${missing.join(", ")}\n` +
      "  Copy .env.example to .env and fill in the values.\n"
  );
  process.exit(1);
}

export default env;
