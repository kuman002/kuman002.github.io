import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://kumaresan.is-a.dev",
  output: "static",
  trailingSlash: "never",
  build: { format: "file" },
  vite: {
    build: {
      chunkSizeWarningLimit: 1200
    }
  }
});