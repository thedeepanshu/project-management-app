// Applies the saved theme before first paint to avoid a light/dark flash.
// A separate file (not inline) so the Content-Security-Policy can forbid inline scripts.
try {
  const saved = localStorage.getItem("twillboard-theme");
  const dark = saved ? saved === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", dark);
} catch {
  // Storage unavailable (private mode): fall back to the light theme.
}
