import express, { Router } from "express";
import { rateLimit } from "express-rate-limit";

import { MAX_BYTES, signUpload, uploadsEnabled } from "../services/cloudinary.js";

// REST endpoints that don't fit GraphQL well: feature flags and upload
// signatures. Everything else lives in /graphql.
export const api = Router();
api.use(express.json({ limit: "16kb" }));

// ── Feature flags for the client ───────────────────────────────────────────

api.get("/config", (_req, res) => {
  res.json({ uploads: { enabled: uploadsEnabled, maxBytes: MAX_BYTES } });
});

// ── Uploads ────────────────────────────────────────────────────────────────

api.post(
  "/uploads/signature",
  rateLimit({
    windowMs: 60_000,
    limit: 60,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many uploads. Wait a minute and try again." },
  }),
  (req, res) => {
    if (!uploadsEnabled) return res.status(503).json({ error: "File uploads aren't configured on this server." });
    const { purpose } = req.body ?? {};
    if (purpose !== "attachment" && purpose !== "avatar") {
      return res.status(400).json({ error: "purpose must be 'attachment' or 'avatar'" });
    }
    res.json(signUpload(purpose));
  }
);

api.use((_req, res) => res.status(404).json({ error: "Not found" }));
