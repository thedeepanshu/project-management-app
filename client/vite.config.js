import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Fixed port: APP_URL, email links and OAuth callbacks point here, so never
    // silently move to another port if it's busy.
    port: 5180,
    strictPort: true,
    // Same-origin in development: the browser calls /graphql and /api and Vite
    // forwards them (so the auth cookie is first-party). API_URL overrides the target.
    proxy: {
      "/graphql": process.env.API_URL ?? "http://localhost:5000",
      "/api": process.env.API_URL ?? "http://localhost:5000",
    },
  },
});
