import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Same-origin in development: the browser calls /graphql and /api and Vite forwards them.
    proxy: {
      "/graphql": "http://localhost:5000",
      "/api": "http://localhost:5000",
    },
  },
});
