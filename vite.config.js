import { defineConfig } from "vite";

export default defineConfig({
  base: "/porfolio/",
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
  },
  build: {
    cssCodeSplit: false,
    assetsInlineLimit: 4096,
  },
});
