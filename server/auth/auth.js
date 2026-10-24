import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { fromNodeHeaders } from "better-auth/node";
import { haveIBeenPwned } from "better-auth/plugins";
import mongoose from "mongoose";

import env from "../config/env.js";
import { sendExistingAccountEmail, sendPasswordResetEmail, sendVerificationEmail } from "../services/mailer.js";
import { deleteAllUserData } from "./userData.js";

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

// Rate limits are keyed by client IP, so the IP must not be spoofable. Headers
// like X-Forwarded-For can be set by anyone; instead the server computes the
// real IP (Express `req.ip`, which honours `trust proxy`) and writes it into
// this header, overwriting whatever the client sent. Better Auth reads only it.
export const CLIENT_IP_HEADER = "x-twillboard-client-ip";

function socialProviders() {
  const { google, github, microsoft } = env.auth.providers;
  return {
    ...(google && { google: { ...google, prompt: "select_account" } }),
    ...(github && { github }),
    ...(microsoft && { microsoft: { ...microsoft, prompt: "select_account" } }),
  };
}

export const enabledProviders = Object.keys(socialProviders());

// Verification links land on their callbackURL already signed in; tag that URL
// with ?verified=1 so the app can welcome the user, wherever they land.
function withVerifiedFlag(url) {
  const link = new URL(url);
  const target = new URL(link.searchParams.get("callbackURL") || "/", env.appUrl);
  target.searchParams.set("verified", "1");
  link.searchParams.set("callbackURL", target.pathname + target.search);
  return link.toString();
}

let auth = null;

/** Builds the auth instance on the app's MongoDB connection (call after connectDB). */
export function initAuth() {
  const client = mongoose.connection.getClient();

  auth = betterAuth({
    appName: "Twillboard",
    baseURL: env.appUrl,
    basePath: "/api/auth",
    secret: env.auth.secret,
    // Passing the client enables transactions (Atlas runs a replica set).
    database: mongodbAdapter(client.db(mongoose.connection.name), { client }),
    trustedOrigins: env.clientOrigins,
    telemetry: { enabled: false },

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: PASSWORD_MIN,
      maxPasswordLength: PASSWORD_MAX,
      autoSignIn: false, // sign-in happens after the email is verified
      resetPasswordTokenExpiresIn: 30 * MINUTE,
      revokeSessionsOnPasswordReset: true, // a reset signs out every device
      sendResetPassword: async ({ user, url }) => sendPasswordResetEmail(user, url),
      // Signing up with a registered email looks identical to a new sign-up
      // (no account enumeration); the real owner gets a heads-up instead.
      onExistingUserSignUp: async ({ user }) => sendExistingAccountEmail(user),
    },

    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true, // signing in unverified re-sends the link
      autoSignInAfterVerification: true,
      expiresIn: DAY,
      sendVerificationEmail: async ({ user, url }) => sendVerificationEmail(user, withVerifiedFlag(url)),
    },

    socialProviders: socialProviders(),

    account: {
      // Store provider tokens encrypted (XChaCha20-Poly1305), not in plain text.
      encryptOAuthTokens: true,
      accountLinking: {
        enabled: true,
        // Only Google's email claim is trusted outright. GitHub and Microsoft
        // link only when the provider reports the email as verified, which
        // blocks takeover via an unverified email on those providers.
        trustedProviders: ["google"],
      },
    },

    session: {
      expiresIn: 7 * DAY,
      updateAge: DAY, // sliding expiry: active users stay signed in
      freshAge: 15 * MINUTE, // deleting the account needs a recent sign-in
      // No cookie cache: every request checks the session in the database, so
      // signing out a device or resetting a password takes effect instantly.
      cookieCache: { enabled: false },
    },

    user: {
      deleteUser: {
        enabled: true,
        // Remove everything the user owns: projects, clients and their files.
        afterDelete: async (user) => deleteAllUserData(user.id),
      },
    },

    // Per-IP limits, stored in MongoDB so they survive restarts and work
    // across multiple server instances.
    rateLimit: {
      enabled: true,
      storage: "database",
      window: MINUTE,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 5 * MINUTE, max: 10 },
        "/sign-up/email": { window: HOUR, max: 5 },
        "/request-password-reset": { window: HOUR, max: 5 },
        "/reset-password": { window: 15 * MINUTE, max: 10 },
        "/send-verification-email": { window: 15 * MINUTE, max: 3 },
        "/change-password": { window: 15 * MINUTE, max: 5 },
        "/delete-user": { window: HOUR, max: 5 },
        "/sign-in/social": { window: MINUTE, max: 20 },
      },
    },

    advanced: {
      ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
      cookiePrefix: "twillboard",
      useSecureCookies: env.isProduction,
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
    },

    plugins: [
      // Rejects passwords found in known breaches (k-anonymity: only the first
      // 5 characters of the password's SHA-1 hash ever leave the server).
      haveIBeenPwned({
        customPasswordCompromisedMessage:
          "This password has appeared in a data breach. Please choose a different one.",
      }),
    ],
  });

  return auth;
}

export function getAuth() {
  if (!auth) throw new Error("Auth used before initAuth()");
  return auth;
}

/** The signed-in user for a Node request, or null. */
export async function getSessionUser(req) {
  const session = await getAuth().api.getSession({ headers: fromNodeHeaders(req.headers) });
  return session?.user ?? null;
}
