import { useSyncExternalStore } from "react";

// The initial class is set by an inline script in index.html before React
// loads; this store keeps every consumer in sync when the user toggles it.

const STORAGE_KEY = "loomwork-theme";
const listeners = new Set();

const getTheme = () => (document.documentElement.classList.contains("dark") ? "dark" : "light");

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage can be unavailable (private mode); the toggle still works for this visit.
  }
  listeners.forEach((listener) => listener());
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme);
  return { theme, toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark") };
}
