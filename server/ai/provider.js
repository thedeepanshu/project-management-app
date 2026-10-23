import Anthropic from "@anthropic-ai/sdk";
import { ApiError as GeminiApiError, GoogleGenAI } from "@google/genai";

import env from "../config/env.js";

// One interface for every provider:
//   streamText({ system, messages, maxTokens, signal }) → async iterable of text chunks
// where messages are [{ role: "user" | "assistant", content: string }].
// Switching provider is a .env change; no feature code knows which one runs.

const DEFAULT_MODELS = {
  gemini: "gemini-flash-latest", // Google's alias for the current Flash model (free tier)
  anthropic: "claude-opus-5-5",
  ollama: "llama3.2",
};

// Claude models that accept the server-side refusal fallback (`fallbacks: "default"`).
const CLAUDE_FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"]);

export class AIRequestError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

function geminiProvider(model, apiKey) {
  const client = new GoogleGenAI({ apiKey });
  return async function* streamText({ system, messages, maxTokens, signal }) {
    const stream = await client.models.generateContentStream({
      model,
      contents: messages.map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      })),
      config: { systemInstruction: system, maxOutputTokens: maxTokens, abortSignal: signal },
    });
    for await (const chunk of stream) {
      if (chunk.text) yield chunk.text;
    }
  };
}

function anthropicProvider(model, apiKey) {
  const client = new Anthropic({ apiKey });
  return async function* streamText({ system, messages, maxTokens, signal }) {
    const stream = client.beta.messages.stream(
      {
        model,
        max_tokens: maxTokens,
        system,
        messages,
        // Short rewrites and chat answers don't need deep reasoning.
        output_config: { effort: "low" },
        // If a safety classifier declines, the API retries on a fallback model in the same call.
        ...(CLAUDE_FALLBACK_MODELS.has(model) && {
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        }),
      },
      { signal }
    );
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
    const message = await stream.finalMessage();
    if (message.stop_reason === "refusal") {
      throw new AIRequestError("The AI declined this request. Try rephrasing it.", 422);
    }
  };
}

function ollamaProvider(model, baseUrl) {
  return async function* streamText({ system, messages, maxTokens, signal }) {
    let response;
    try {
      response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model,
          stream: true,
          messages: [{ role: "system", content: system }, ...messages],
          options: { num_predict: maxTokens },
        }),
        signal,
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new AIRequestError(`Can't reach Ollama at ${baseUrl}. Is it running?`, 503);
    }
    if (!response.ok) {
      throw new AIRequestError(`Ollama error ${response.status}: ${await response.text()}`, 502);
    }

    // Ollama streams newline-delimited JSON objects.
    const decoder = new TextDecoder();
    let buffer = "";
    for await (const bytes of response.body) {
      buffer += decoder.decode(bytes, { stream: true });
      let newline;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (!line) continue;
        const data = JSON.parse(line);
        if (data.error) throw new AIRequestError(`Ollama: ${data.error}`, 502);
        if (data.message?.content) yield data.message.content;
      }
    }
  };
}

function createAI() {
  if (!env.ai) return null;
  const { provider, apiKey, ollamaUrl } = env.ai;
  const model = env.ai.model ?? DEFAULT_MODELS[provider];
  const streamText =
    provider === "gemini"
      ? geminiProvider(model, apiKey)
      : provider === "anthropic"
        ? anthropicProvider(model, apiKey)
        : ollamaProvider(model, ollamaUrl);
  return { provider, model, streamText };
}

/** The configured AI, or null when no provider is set up. */
export const ai = createAI();

/** Collects a whole streamed response into one string. */
export async function generateText(options) {
  let text = "";
  for await (const chunk of ai.streamText(options)) text += chunk;
  return text;
}

/** Maps provider errors to a status code and a message safe to show users. */
export function describeAIError(error) {
  if (error instanceof AIRequestError) return { status: error.status, message: error.message };

  const status =
    error instanceof GeminiApiError || error instanceof Anthropic.APIError ? error.status : undefined;

  if (status === 429) {
    return { status: 429, message: "The AI is at its usage limit right now. Please try again in a minute." };
  }
  if (status === 401 || status === 403) {
    return { status: 503, message: "The AI service rejected the API key. Check the key in the server's .env." };
  }
  if (status === 404) {
    return { status: 503, message: "The configured AI model wasn't found. Check AI_MODEL in the server's .env." };
  }
  if (status === 400) {
    return { status: 400, message: "The AI couldn't process that request." };
  }
  return { status: 502, message: "The AI service is unavailable right now. Please try again." };
}
