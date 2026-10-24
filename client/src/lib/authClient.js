import { createAuthClient } from "better-auth/react";

// Same-origin: the API serves /api/auth (proxied by Vite in development), and
// the session lives in an HttpOnly cookie the page's JavaScript can't read.
export const authClient = createAuthClient({ basePath: "/api/auth" });

const MESSAGES = {
  INVALID_EMAIL_OR_PASSWORD: "Incorrect email or password.",
  EMAIL_NOT_VERIFIED: "Please verify your email first. We've sent you a new link.",
  USER_ALREADY_EXISTS: "An account with this email already exists.",
  INVALID_PASSWORD: "That password isn't right.",
  PASSWORD_TOO_SHORT: "Password is too short.",
  PASSWORD_TOO_LONG: "Password is too long.",
  INVALID_TOKEN: "This link is invalid or has expired. Request a new one.",
  TOKEN_EXPIRED: "This link has expired. Request a new one.",
  SESSION_EXPIRED: "For your security, please sign in again to do this.",
  SESSION_NOT_FRESH: "For your security, please sign in again to do this.",
  CREDENTIAL_ACCOUNT_NOT_FOUND: "This account doesn't use a password yet.",
  FAILED_TO_UNLINK_LAST_ACCOUNT: "You can't remove your only way to sign in.",
};

/** A user-facing message for a Better Auth client error ({ status, code, message }). */
export function authErrorMessage(error) {
  if (!error) return null;
  if (error.status === 429) return "Too many attempts. Please wait a few minutes and try again.";
  if (error.status === 0 || error.status === undefined) return "Can't reach the server. Check your connection and try again.";
  return MESSAGES[error.code] ?? error.message ?? "Something went wrong. Please try again.";
}

/** Only allow redirects back into this app (never to another site). */
export function safeNext(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")
    ? value
    : "/";
}
