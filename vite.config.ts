import { existsSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    {
      // dev only: serve public/ html without .html suffix
      name: "serve-public-html",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const url = new URL(req.url!, "http://localhost");
          const file = url.pathname + (url.pathname.endsWith("/") ? "index.html" : ".html");
          if (existsSync(join(server.config.publicDir, file))) req.url = file + url.search;
          next();
        });
      },
    },
  ],
  build: {
    rolldownOptions: {
      input: { about: "about.html" },
    },
    modulePreload: { polyfill: false },
  },
});
