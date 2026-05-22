import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@medcabinet/shared": fileURLToPath(new URL("../shared/src/index.ts", import.meta.url))
    }
  },
  server: {
    port: 3000,
    proxy: {
      "/api": "http://localhost:4000"
    }
  }
});
