// Centralised, validated environment config. Fails fast with a readable message
// instead of letting a missing variable surface later as a cryptic stack trace.

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProduction = nodeEnv === "production";

const list = (value) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim().replace(/\/$/, ""))
    .filter(Boolean);

// An OAuth provider is enabled only when both of its credentials are set.
function oauth(prefix, extra = {}) {
  const clientId = process.env[`${prefix}_CLIENT_ID`]?.trim();
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`]?.trim();
  return clientId && clientSecret ? { clientId, clientSecret, ...extra } : null;
}

// Public URL people open in the browser. Auth links in emails and OAuth
// callbacks are built from it, so it must match what users actually visit
// (in development that's the Vite dev server, which proxies /api).
const appUrl = (process.env.APP_URL ?? (isProduction ? "" : "http://localhost:5180")).replace(/\/$/, "");

const env = {
  nodeEnv,
  isProduction,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  appUrl,
  // Extra origins allowed to call the API cross-origin (if the app is hosted elsewhere).
  clientOrigins: [...new Set([appUrl, ...list(process.env.CLIENT_ORIGIN)].filter(Boolean))],

  auth: {
    // Signs session cookies and encrypts OAuth tokens. Generate with:
    //   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
    secret: process.env.BETTER_AUTH_SECRET,
    providers: {
      google: oauth("GOOGLE"),
      github: oauth("GITHUB"),
      microsoft: oauth("MICROSOFT", { tenantId: process.env.MICROSOFT_TENANT_ID?.trim() || "common" }),
    },
  },

  // Gmail address + app password (https://myaccount.google.com/apppasswords).
  // Without them, development prints emails to the console instead of sending.
  smtp: {
    user: process.env.SMTP_USER?.trim(),
    pass: process.env.SMTP_PASS?.replace(/\s+/g, ""),
    from: process.env.EMAIL_FROM?.trim(),
  },

  // cloudinary://<api_key>:<api_secret>@<cloud_name> — enables file uploads.
  cloudinaryUrl: process.env.CLOUDINARY_URL,
};

const problems = [];
if (!env.mongoUri) problems.push("MONGO_URI is missing");
if (!env.auth.secret) problems.push("BETTER_AUTH_SECRET is missing");
else if (env.auth.secret.length < 32) problems.push("BETTER_AUTH_SECRET must be at least 32 characters");
if (!env.appUrl) problems.push("APP_URL is missing (the public URL of the app)");
else if (isProduction && !env.appUrl.startsWith("https://")) problems.push("APP_URL must use https:// in production");
if (isProduction && !(env.smtp.user && env.smtp.pass)) {
  problems.push("SMTP_USER and SMTP_PASS are required in production (verification and reset emails)");
}

if (problems.length > 0) {
  console.error(
    `\n✖ Configuration problem${problems.length > 1 ? "s" : ""}:\n${problems.map((p) => `  • ${p}`).join("\n")}\n` +
      "  See .env.example for every setting.\n"
  );
  process.exit(1);
}

export default env;
