// REST helpers for the non-GraphQL endpoints: feature config, AI and uploads.

export class ApiError extends Error {}

async function errorFrom(response) {
  try {
    const body = await response.json();
    return new ApiError(body.error ?? `Request failed (${response.status})`);
  } catch {
    return new ApiError(`Request failed (${response.status})`);
  }
}

export async function postJSON(path, body, { signal } = {}) {
  let response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError("Can't reach the server. Check that the API is running.");
  }
  if (!response.ok) throw await errorFrom(response);
  return response.json();
}

/**
 * Calls a streaming AI endpoint. The server sends newline-delimited JSON:
 * {"text": "..."} chunks, then {"done": true} or {"error": "..."}.
 * Calls onText with the full text so far; resolves with the final text.
 */
export async function streamAI(path, body, { signal, onText }) {
  let response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError("Can't reach the server. Check that the API is running.");
  }
  if (!response.ok) throw await errorFrom(response);

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let text = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let newline;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      const event = JSON.parse(line);
      if (event.error) throw new ApiError(event.error);
      if (event.text) {
        text += event.text;
        onText?.(text);
      }
    }
  }
  return text;
}

let configPromise;

/** Which optional features the server has enabled. Fetched once per page load. */
export function getAppConfig() {
  configPromise ??= fetch("/api/config")
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null)
    .then((config) => config ?? { ai: { enabled: false }, uploads: { enabled: false } });
  return configPromise;
}
