import { defineConfig } from "astro/config";

import react from "@astrojs/react";

export default defineConfig({
  site: "https://kumaresan.is-a.dev",
  output: "static",
  trailingSlash: "never",
  build: { format: "file" },

  vite: {
    build: {
      chunkSizeWarningLimit: 1200
    }
  },

  integrations: [react()]
});