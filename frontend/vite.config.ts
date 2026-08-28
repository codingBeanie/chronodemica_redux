import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const pkg = JSON.parse(readFileSync(fileURLToPath(new URL("./package.json", import.meta.url)), "utf-8"));

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    // Deliberately not Vite's 5173 default — kept clear for other projects
    // that use it.
    port: 5180,
    proxy: {
      // Mirrors the /api proxy nginx does in production (see nginx.conf), so the
      // frontend can always call relative paths regardless of environment.
      "/api": "http://localhost:8010",
    },
  },
});
