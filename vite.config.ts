import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The backend port is read from the environment at dev-server start — it is
// deliberately NOT baked into this file, so clones/forks of this project can
// run side-by-side on their own ports (pass BACKEND_PORT when launching).
const BACKEND_PORT = process.env.BACKEND_PORT ?? "8000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // One 519 kB bundle meant a cheap Android phone downloaded the whole
        // course before showing the dashboard. Split the two big vendors out so
        // they cache across deploys and the first paint is smaller.
        /**
         * Vendor splitting only — react, motion and fflate are shared by every
         * screen, so they cache across deploys instead of being re-downloaded
         * with each build.
         *
         * Feature code is deliberately NOT forced into named chunks here: the
         * Excel workbook is already behind `lazy()` in App.tsx, so Rollup keeps
         * it in its own route chunk and the dashboard never downloads it. (An
         * explicit `excel` group was tried and it made things *worse* — the
         * dashboard pulled 1.6 MB because the chunk became a shared dependency.)
         */
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;
          if (/[\\/]node_modules[\\/]\.pnpm[\\/][^\\/]*react(-dom)?@/.test(id) || /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return "react";
          if (/[\\/]node_modules[\\/][^\\/]*(motion|framer-motion)/.test(id)) return "motion";
          if (/[\\/]node_modules[\\/]\.pnpm[\\/][^\\/]*fflate/.test(id)) return "vendor";
          return undefined;
        },
      },
    },
  },
  server: {
    // 0.0.0.0 so container/remote previews work; override with HOST=127.0.0.1.
    host: process.env.HOST ?? "0.0.0.0",
    port: Number(process.env.WEB_PORT ?? 5173),
    // Vite 6 rejects requests whose Host header is not localhost ("Blocked
    // request. This host is not allowed"), which is exactly what a proxied
    // preview/tunnel sends. The dev server only ever serves this repo's own
    // source, so any Host is fine; production never uses Vite at all.
    allowedHosts: true,
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
        target: `http://127.0.0.1:${BACKEND_PORT}`,
        // Keep the browser's Host header: the server compares Origin and Host
        // to reject cross-origin cookie mutations (see server/main.py), and
        // rewriting Host here made every dev write look cross-origin.
        changeOrigin: false,
        ws: true,
      },
    },
  },
  preview: {
    host: process.env.HOST ?? "0.0.0.0",
    port: Number(process.env.WEB_PORT ?? 4173),
    allowedHosts: true,
  },
});
