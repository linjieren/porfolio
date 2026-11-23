import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { defineConfig } from "vite";

function healthAgentRoutes() {
  const rewrite = (req) => {
    const raw = req.url || "";
    const path = raw.split("?")[0];
    const query = raw.includes("?") ? raw.slice(raw.indexOf("?")) : "";
    if (path === "/health_agent" || path === "/health_agent/") {
      req.url = "/health_agent.html" + query;
      return;
    }
    if (path === "/porfolio/health_agent" || path === "/porfolio/health_agent/") {
      req.url = "/porfolio/health_agent.html" + query;
    }
  };

  return {
    name: "health-agent-routes",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        rewrite(req);
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        rewrite(req);
        next();
      });
    },
    async closeBundle() {
      const dir = resolve("dist/health_agent");
      await mkdir(dir, { recursive: true });
      await copyFile(resolve("dist/health_agent.html"), resolve(dir, "index.html"));
    },
  };
}

export default defineConfig({
  base: "/porfolio/",
  plugins: [healthAgentRoutes()],
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
    rollupOptions: {
      input: {
        main: resolve("index.html"),
        health_agent: resolve("health_agent.html"),
      },
    },
  },
});
