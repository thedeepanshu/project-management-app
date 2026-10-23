import { ArrowUp, MessageCircleQuestion, RotateCcw, Sparkles, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useAppConfig } from "../../hooks/useAppConfig";
import { streamAI } from "../../lib/api";

const SUGGESTIONS = [
  "What's overdue right now?",
  "What's due in the next two weeks?",
  "Summarize my in-progress projects",
  "How do I add files to a project?",
];

function isTyping(target) {
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function Message({ message, streaming }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-twill-600 px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap text-white">
          {message.content}
        </p>
      </div>
    );
  }
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-linear-to-br from-twill-500 to-thread-500 text-white">
        <Sparkles className="size-3.5" />
      </span>
      <p
        className={`max-w-[85%] rounded-2xl rounded-tl-md px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap ring-1 ${
          message.error ? "bg-red-500/8 text-red-700 ring-red-500/20 dark:text-red-300" : "bg-elevated ring-line"
        }`}
      >
        {message.content || (streaming && <span className="text-subtle">Thinking…</span>)}
        {streaming && message.content && (
          <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse rounded-sm bg-twill-500 align-middle" />
        )}
      </p>
    </div>
  );
}

/** Floating "Ask Twillboard" chat. Read-only: it explains the app and answers from workspace data. */
export function Assistant() {
  const { ai } = useAppConfig();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const controllerRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // "A" opens the assistant from anywhere (when not typing or in a dialog).
  useEffect(() => {
    if (!ai.enabled) return;
    function onKeyDown(event) {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      if (document.querySelector("dialog[open]")) return;
      if (event.key.toLowerCase() === "a") {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ai.enabled]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Keep the newest text in view while it streams.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  if (!ai.enabled) return null;

  async function send(text) {
    const question = text.trim();
    if (!question || streaming) return;

    // Failed answers aren't sent back as history.
    const history = [...messages.filter((m) => !m.error), { role: "user", content: question }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    const controller = new AbortController();
    controllerRef.current = controller;
    const setAnswer = (patch) =>
      setMessages((list) => [...list.slice(0, -1), { ...list.at(-1), ...patch }]);

    try {
      await streamAI(
        "/api/ai/chat",
        { messages: history.map(({ role, content }) => ({ role, content })) },
        { signal: controller.signal, onText: (content) => setAnswer({ content }) }
      );
    } catch (error) {
      if (error.name !== "AbortError") setAnswer({ content: error.message, error: true });
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  }

  function reset() {
    controllerRef.current?.abort();
    setMessages([]);
    setInput("");
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed right-4 bottom-24 z-30 flex h-12 cursor-pointer items-center gap-2 rounded-full bg-linear-to-br from-twill-500 to-twill-700 px-4 font-medium text-white shadow-[0_10px_30px_-8px] shadow-twill-600/70 transition hover:brightness-110 active:scale-95 lg:right-8 lg:bottom-8"
          aria-label="Ask Twillboard (A)"
          title="Ask Twillboard (A)"
        >
          <Sparkles className="size-5" />
          <span className="hidden text-sm sm:inline">Ask Twillboard</span>
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-label="Twillboard Assistant"
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          className="fixed inset-x-3 top-20 bottom-24 z-40 flex animate-rise flex-col overflow-hidden rounded-3xl bg-surface shadow-lift ring-1 ring-line sm:inset-x-auto sm:right-6 sm:bottom-24 sm:w-[400px] lg:top-auto lg:right-8 lg:bottom-8 lg:h-[min(640px,calc(100dvh-4rem))]"
        >
          <header className="flex items-center gap-3 border-b border-line px-4 py-3">
            <span className="grid size-9 place-items-center rounded-xl bg-linear-to-br from-twill-500 to-thread-500 text-white">
              <Sparkles className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display font-bold">Twillboard Assistant</h2>
              <p className="text-xs text-subtle">Answers from your workspace · read-only</p>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={reset}
                className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted hover:bg-ink/6 hover:text-ink"
                aria-label="New chat"
                title="New chat"
              >
                <RotateCcw className="size-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted hover:bg-ink/6 hover:text-ink"
              aria-label="Close assistant"
            >
              <X className="size-4" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
            {messages.length === 0 ? (
              <div className="pt-4 text-center">
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-twill-500/10 text-twill-600 dark:text-twill-300">
                  <MessageCircleQuestion className="size-6" />
                </span>
                <p className="mt-3 font-display text-lg font-bold">How can I help?</p>
                <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
                  Ask about your projects and clients, or how anything in Twillboard works.
                </p>
                <div className="mt-5 flex flex-col gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => send(suggestion)}
                      className="cursor-pointer rounded-xl bg-elevated px-3.5 py-2.5 text-left text-sm ring-1 ring-line transition hover:ring-twill-500/40"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <Message key={index} message={message} streaming={streaming && index === messages.length - 1} />
              ))
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2 border-t border-line p-3"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder="Ask about your work…"
              aria-label="Message the assistant"
              className="max-h-32 min-h-10 flex-1 resize-none rounded-xl bg-elevated px-3.5 py-2.5 text-sm ring-1 ring-line-strong [field-sizing:content] placeholder:text-subtle focus:ring-2 focus:ring-twill-500 focus:outline-none"
            />
            {streaming ? (
              <button
                type="button"
                onClick={() => controllerRef.current?.abort()}
                className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl bg-ink text-canvas"
                aria-label="Stop"
              >
                <Square className="size-4" fill="currentColor" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl bg-linear-to-br from-twill-500 to-twill-700 text-white transition disabled:cursor-default disabled:opacity-40"
                aria-label="Send"
              >
                <ArrowUp className="size-5" />
              </button>
            )}
          </form>
        </section>
      )}
    </>
  );
}
