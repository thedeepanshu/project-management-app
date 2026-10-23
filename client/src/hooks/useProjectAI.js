import { useEffect, useRef, useState } from "react";

import { postJSON, streamAI } from "../lib/api";

/** Streams an AI rewrite (or first draft) of a project description. */
export function useDescriptionAI() {
  const [suggestion, setSuggestion] = useState(null); // null | { text, streaming, error }
  const controllerRef = useRef(null);

  // Stop any in-flight request when the form closes.
  useEffect(() => () => controllerRef.current?.abort(), []);

  async function run(context) {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setSuggestion({ text: "", streaming: true, error: null });
    try {
      const text = (
        await streamAI("/api/ai/description", context, {
          signal: controller.signal,
          onText: (partial) => setSuggestion({ text: partial, streaming: true, error: null }),
        })
      ).trim();
      setSuggestion({ text, streaming: false, error: text ? null : "The AI didn't return any text. Try again." });
    } catch (error) {
      if (error.name === "AbortError") {
        // Stopped by the user: keep whatever was written so far.
        setSuggestion((current) => current && { ...current, streaming: false });
        return;
      }
      setSuggestion({ text: "", streaming: false, error: error.message });
    }
  }

  return {
    suggestion,
    run,
    stop: () => controllerRef.current?.abort(),
    clear: () => {
      controllerRef.current?.abort();
      setSuggestion(null);
    },
  };
}

/** Asks the AI for three clearer project titles. */
export function useTitleAI() {
  const [state, setState] = useState({ loading: false, titles: [], error: null });

  async function suggest(context) {
    setState({ loading: true, titles: [], error: null });
    try {
      const { titles } = await postJSON("/api/ai/titles", context);
      setState({ loading: false, titles, error: null });
    } catch (error) {
      setState({ loading: false, titles: [], error: error.message });
    }
  }

  return { ...state, suggest, clear: () => setState({ loading: false, titles: [], error: null }) };
}
