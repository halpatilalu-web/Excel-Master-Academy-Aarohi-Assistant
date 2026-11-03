import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// This file runs under Node, but the template ships no @types/node (nothing
// outside the offline pnpm store can be installed). Declare the one global
// it reads so `tsc -b` type-checks it without the package.
declare const process: { env: Record<string, string | undefined>; cwd(): string };

// The backend port is read from the environment at dev-server start — it is
// deliberately NOT baked into this file, so clones/forks of this project can
// run side-by-side on their own ports (pass BACKEND_PORT when launching).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // No full-screen error overlay. A preview is a dev server, but the people
    // looking at it are the owner and whoever they shared the link with —
    // neither can act on a stack trace, and the agent is told what broke
    // through the dev server's log, not through this. Errors still reach the
    // console, which is what the build gate reads.
    hmr: { overlay: false },
    // Only src/, public/ and index.html feed the page. Anything else changing
    // makes Vite full-reload the preview — the backend's SQLite WAL files
    // (server/data.db-shm moves on every API call, so typing into a search
    // box reloaded the page) and the publish build in .web-builder/.
    // Vite appends these to its own defaults (.git, node_modules).
    watch: {
      ignored: [
        (p: string) => p.startsWith(`${process.cwd()}/server/`) || p.startsWith(`${process.cwd()}/.web-builder/`),
        "**/*.db",
        "**/*.db-*",
        "**/*.tsbuildinfo",
        `${process.cwd()}/*.md`,
      ],
    },
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${process.env.BACKEND_PORT ?? "8000"}`,
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
