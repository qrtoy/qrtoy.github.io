import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rolldownOptions: {
      input: { about: "about.html", edit: "edit.html" },
    },
    modulePreload: { polyfill: false },
  },
});
