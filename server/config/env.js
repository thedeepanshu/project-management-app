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
  ai: resolveAI(),
  // cloudinary://<api_key>:<api_secret>@<cloud_name> — enables file uploads.
  cloudinaryUrl: process.env.CLOUDINARY_URL,
};

// AI is optional. AI_PROVIDER picks one explicitly; otherwise the first
// provider with a key wins. Without any, AI features are simply hidden.
function resolveAI() {
  const keys = {
    gemini: process.env.GEMINI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    ollama: "local", // Ollama runs on this machine and needs no key.
  };
  const requested = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (requested === "none") return null;

  let provider = requested;
  if (!provider) provider = keys.gemini ? "gemini" : keys.anthropic ? "anthropic" : null;
  if (!provider) return null;

  if (!(provider in keys)) {
    console.warn(`⚠ Unknown AI_PROVIDER "${requested}" — AI features disabled.`);
    return null;
  }
  if (!keys[provider]) {
    console.warn(`⚠ AI_PROVIDER is "${provider}" but its API key is missing — AI features disabled.`);
    return null;
  }

  return {
    provider,
    apiKey: keys[provider],
    model: process.env.AI_MODEL?.trim() || null,
    ollamaUrl: process.env.OLLAMA_URL ?? "http://localhost:11434",
  };
}

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
