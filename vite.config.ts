import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import { bytes, encode, MAX_BYTES, toDataUrl } from "./src/link.ts";
import { imports, init, minify } from "./src/minify.ts";

const SITE = "https://qrtoy.github.io";
const REPO = "https://github.com/qrtoy/qrtoy.github.io";
const EXAMPLES = resolve("examples");

// replaces <!-- examples --> with apps from /examples
function examples(): Plugin {
  let ready: Promise<void> | undefined;
  return {
    name: "examples",
    configureServer(server) {
      server.watcher.add(EXAMPLES);
      server.watcher.on("all", (_, file) => {
        if (file.startsWith(EXAMPLES)) server.ws.send({ type: "full-reload" });
      });
    },
    transformIndexHtml: {
      order: "pre",
      async handler(html, ctx) {
        if (!html.includes("<!-- examples -->")) return;
        const wasm = createRequire(import.meta.url).resolve("@minify-html/wasm/index_bg.wasm");
        ready ??= WebAssembly.instantiate(readFileSync(wasm), imports).then((r) =>
          init(r.instance),
        );
        await ready;
        const items = readdirSync(EXAMPLES)
          .filter((file) => file.endsWith(".html"))
          .sort()
          .map((file) => {
            const src = readFileSync(join(EXAMPLES, file), "utf8");
            const title = src.match(/<title>(.*?)<\/title>/is)?.[1].trim() || file;

            // minify-html doesn't strip js comments
            // intentionally brittle
            const src2 = src
              .split("\n")
              .filter((line) => !line.startsWith("  //"))
              .join("\n");
            const text = minify(src2);
            const data = toDataUrl("text/html", text, encode(text));
            const size = bytes(SITE + "#" + data);
            let note = `${size} B`;
            if (size > MAX_BYTES) {
              note = `too long for a QR code (max ${MAX_BYTES} B)`;
              if (!ctx.server) throw new Error(`examples/${file}: ${size} B, ${note}`);
            }
            const h = data.replaceAll("&", "&amp;"); // & is used for html entities
            return `<li><div class="head"><a href="/#${h}">${title}</a><a class="muted" target="_blank" href="${REPO}/blob/main/examples/${file}">unminified source</a></div><div class="qr"></div></li>`;
          });
        return html.replace("<!-- examples -->", items.join(""));
      },
    },
  };
}

const PAGES: Record<string, string> = {
  about: "src/about/index.html",
  edit: "src/edit/index.html",
  share: "src/share/index.html",
};

function remapPages(): Plugin {
  return {
    name: "pages",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const { pathname, search } = new URL(req.url!, "http://localhost");
        const to = PAGES[pathname.slice(1)];
        if (to) req.url = `/${to}${search}`;
        // needed to serve public/index.html in dev
        else if (pathname === "/") req.url = `/index.html${search}`;
        next();
      });
    },
    generateBundle: {
      order: "post",
      handler(_, bundle) {
        for (const [to, from] of Object.entries(PAGES)) {
          const file = bundle[from];
          if (!file || file.type !== "asset") throw `${from} not found`;
          delete bundle[from];
          this.emitFile({ type: "asset", fileName: `${to}.html`, source: file.source });
        }
      },
    },
  };
}

export default defineConfig({
  plugins: [remapPages(), examples()],
  build: {
    rolldownOptions: {
      input: PAGES,
    },
    modulePreload: { polyfill: false },
  },
});
