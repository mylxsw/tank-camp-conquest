import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
    host: true,
    // Local Stage A: browser uses same-origin /colyseus; proxy to Colyseus on 2567.
    proxy: {
      "/colyseus": {
        target: "http://127.0.0.1:2567",
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/colyseus/, ""),
      },
    },
  },
  build: { outDir: "dist" },
});
