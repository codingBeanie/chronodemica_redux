import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Mirrors the /api proxy nginx does in production (see nginx.conf), so the
      // frontend can always call relative paths regardless of environment.
      "/api": "http://localhost:8000",
    },
  },
});
