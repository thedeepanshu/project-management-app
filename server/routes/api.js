import express, { Router } from "express";
import { rateLimit } from "express-rate-limit";

import { enabledProviders, getSessionUser, PASSWORD_MAX, PASSWORD_MIN } from "../auth/auth.js";
import env from "../config/env.js";
import { MAX_BYTES, PURPOSES, signUpload, uploadsEnabled } from "../services/cloudinary.js";
import { emailToConsole } from "../services/mailer.js";

// REST endpoints that don't fit GraphQL well: public feature flags and upload
// signatures. Auth lives under /api/auth (Better Auth); data in /graphql.
export const api = Router();
api.use(express.json({ limit: "16kb" }));

/** Rejects the request with 401 unless there's a valid session. */
async function requireUser(req, res, next) {
  try {
    req.user = await getSessionUser(req);
  } catch (error) {
    return next(error);
  }
  if (!req.user) return res.status(401).json({ error: "Please sign in to continue." });
  next();
}

// ── Public: what the client should show ────────────────────────────────────

api.get("/config", (_req, res) => {
  res.set("Cache-Control", "no-store").json({
    auth: { providers: enabledProviders, password: { min: PASSWORD_MIN, max: PASSWORD_MAX } },
    uploads: { enabled: uploadsEnabled, maxBytes: MAX_BYTES },
    // Development-only hints for setup gaps (never sent in production).
    ...(!env.isProduction && { dev: { emailToConsole } }),
  });
});

// ── Uploads (signed-in users only) ─────────────────────────────────────────

api.post(
  "/uploads/signature",
  requireUser,
  rateLimit({
    windowMs: 60_000,
    limit: 60,
    keyGenerator: (req) => req.user.id, // per account, not per IP
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many uploads. Wait a minute and try again." },
  }),
  (req, res) => {
    if (!uploadsEnabled) return res.status(503).json({ error: "File uploads aren't configured on this server." });
    const { purpose } = req.body ?? {};
    if (!PURPOSES.includes(purpose)) {
      return res.status(400).json({ error: "purpose must be 'attachment' or 'avatar'" });
    }
    res.json(signUpload(purpose, req.user.id));
  }
);

api.use((_req, res) => res.status(404).json({ error: "Not found" }));
