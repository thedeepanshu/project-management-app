// REST helpers for the non-GraphQL endpoints: feature config and uploads.

export class ApiError extends Error {}

async function errorFrom(response) {
  try {
    const body = await response.json();
    return new ApiError(body.error ?? `Request failed (${response.status})`);
  } catch {
    return new ApiError(`Request failed (${response.status})`);
  }
}

export async function postJSON(path, body, { signal, method = "POST" } = {}) {
  let response;
  try {
    response = await fetch(path, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError("Can't reach the server. Check that the API is running.");
  }
  if (!response.ok) throw await errorFrom(response);
  return response.json();
}

let configPromise;

/** Which optional features the server has enabled. Fetched once per page load. */
export function getAppConfig() {
  configPromise ??= fetch("/api/config")
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null)
    .then((config) => config ?? { auth: { providers: [], password: { min: 10, max: 128 } }, uploads: { enabled: false } });
  return configPromise;
}
