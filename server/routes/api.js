import express, { Router } from "express";
import { rateLimit } from "express-rate-limit";
import mongoose from "mongoose";

import { ai, AIRequestError, describeAIError, generateText } from "../ai/provider.js";
import {
  assistantSystem,
  DRAFT_DESCRIPTION_SYSTEM,
  ENHANCE_DESCRIPTION_SYSTEM,
  SUGGEST_TITLES_SYSTEM,
} from "../ai/prompts.js";
import { buildWorkspaceSnapshot } from "../ai/snapshot.js";
import Client from "../models/Client.js";
import { MAX_BYTES, signUpload, uploadsEnabled } from "../services/cloudinary.js";

// REST endpoints that don't fit GraphQL well: streaming AI responses and
// upload signatures. Everything else lives in /graphql.
export const api = Router();
api.use(express.json({ limit: "64kb" }));

const limiter = (windowMs, limit, message) =>
  rateLimit({ windowMs, limit, standardHeaders: "draft-8", legacyHeaders: false, message: { error: message } });

// ── Feature flags for the client ───────────────────────────────────────────

api.get("/config", (_req, res) => {
  res.json({
    ai: { enabled: Boolean(ai), provider: ai?.provider ?? null, model: ai?.model ?? null },
    uploads: { enabled: uploadsEnabled, maxBytes: MAX_BYTES },
  });
});

// ── Uploads ────────────────────────────────────────────────────────────────

api.post("/uploads/signature", limiter(60_000, 60, "Too many uploads. Wait a minute and try again."), (req, res) => {
  if (!uploadsEnabled) return res.status(503).json({ error: "File uploads aren't configured on this server." });
  const { purpose } = req.body ?? {};
  if (purpose !== "attachment" && purpose !== "avatar") {
    return res.status(400).json({ error: "purpose must be 'attachment' or 'avatar'" });
  }
  res.json(signUpload(purpose));
});

// ── AI ─────────────────────────────────────────────────────────────────────

// The app has no accounts yet, so these limits are what protects the API quota.
api.use(
  "/ai",
  limiter(60_000, 12, "Too many AI requests. Wait a minute and try again."),
  limiter(24 * 60 * 60_000, 200, "Daily AI limit reached. Please try again tomorrow."),
  (_req, res, next) => (ai ? next() : res.status(503).json({ error: "AI isn't configured on this server." }))
);

const text = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/**
 * Streams model output as newline-delimited JSON: {"text": "..."} chunks, then
 * {"done": true} or {"error": "..."}. Headers are only sent once the first
 * chunk arrives, so failures before that get a normal HTTP error status.
 */
async function streamToClient(res, options) {
  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    res.status(200).set({
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();
  };

  try {
    for await (const chunk of ai.streamText({ ...options, signal: controller.signal })) {
      start();
      res.write(`${JSON.stringify({ text: chunk })}\n`);
    }
    start();
    res.end(`${JSON.stringify({ done: true })}\n`);
  } catch (error) {
    if (controller.signal.aborted) return; // the user pressed Stop or closed the page
    const { status, message } = describeAIError(error);
    console.error(`AI (${ai.provider}) error:`, error.message);
    if (started) res.end(`${JSON.stringify({ error: message })}\n`);
    else res.status(status).json({ error: message });
  }
}

async function projectContext(body) {
  const lines = [`Project title: ${text(body.name, 100) || "(none)"}`];
  if (mongoose.isValidObjectId(body.clientId)) {
    const client = await Client.findById(body.clientId).lean();
    if (client) lines.push(`Client: ${client.name}${client.company ? ` (${client.company})` : ""}`);
  }
  const priority = { LOW: "Low", MEDIUM: "Medium", HIGH: "High" }[body.priority];
  if (priority) lines.push(`Priority: ${priority}`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(body.dueDate ?? "")) lines.push(`Due date: ${body.dueDate}`);
  return lines.join("\n");
}

api.post("/ai/description", async (req, res) => {
  const body = req.body ?? {};
  const name = text(body.name, 100);
  const description = text(body.description, 2000);
  if (!name && !description) {
    return res.status(400).json({ error: "Add a project title or some description text first." });
  }

  const context = await projectContext(body);
  const drafting = !description;
  await streamToClient(res, {
    system: drafting ? DRAFT_DESCRIPTION_SYSTEM : ENHANCE_DESCRIPTION_SYSTEM,
    messages: [
      {
        role: "user",
        content: drafting
          ? `${context}\n\nWrite a short description draft for this project.`
          : `${context}\n\nCurrent description:\n"""\n${description}\n"""\n\nRewrite this description following your rules.`,
      },
    ],
    maxTokens: 1024,
  });
});

api.post("/ai/titles", async (req, res) => {
  const body = req.body ?? {};
  const name = text(body.name, 100);
  if (!name) return res.status(400).json({ error: "Type a title first, then ask for suggestions." });

  try {
    const description = text(body.description, 600);
    const output = await generateText({
      system: SUGGEST_TITLES_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Current title: ${name}${description ? `\nDescription: ${description}` : ""}\n\nSuggest 3 better titles.`,
        },
      ],
      maxTokens: 256,
    });
    const titles = [
      ...new Set(
        output
          .split("\n")
          .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").replace(/^["'“”]+|["'“”]+$/g, "").trim())
          .filter((line) => line.length >= 2 && line.length <= 100)
      ),
    ].slice(0, 3);
    if (titles.length === 0) throw new AIRequestError("The AI didn't return any suggestions. Try again.");
    res.json({ titles });
  } catch (error) {
    const { status, message } = describeAIError(error);
    console.error(`AI (${ai.provider}) error:`, error.message);
    res.status(status).json({ error: message });
  }
});

api.post("/ai/chat", async (req, res) => {
  const raw = Array.isArray(req.body?.messages) ? req.body.messages : [];
  // Keep the most recent turns and make sure the conversation starts with the user.
  let messages = raw
    .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 2000) }))
    .filter((m) => m.content)
    .slice(-12);
  while (messages[0]?.role === "assistant") messages = messages.slice(1);

  if (messages.at(-1)?.role !== "user") {
    return res.status(400).json({ error: "Send a question to the assistant." });
  }

  const snapshot = await buildWorkspaceSnapshot();
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  await streamToClient(res, { system: assistantSystem({ snapshot, today }), messages, maxTokens: 1024 });
});

api.use((_req, res) => res.status(404).json({ error: "Not found" }));
