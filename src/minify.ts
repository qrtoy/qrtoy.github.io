// Shared by the editor (through minify-web.ts) and the build (vite.config.ts), which each load the wasm their own way.

import * as bg from "@minify-html/wasm/index_bg.js";

export const imports = { "./index_bg.js": bg };
export const init = (instance: WebAssembly.Instance) => bg.__wbg_set_wasm(instance.exports);

export type Options = Record<"css" | "js" | "stripComments" | "omitTags" | "tricks", boolean>;

export const minify = (
  html: string,
  o: Options = {
    css: true,
    js: true,
    stripComments: true,
    omitTags: true,
    tricks: true,
  },
) =>
  new TextDecoder().decode(
    bg.minify(new TextEncoder().encode(html), {
      minify_css: o.css,
      minify_js: o.js,
      keep_comments: !o.stripComments,
      keep_closing_tags: !o.omitTags,
      keep_html_and_head_opening_tags: !o.omitTags,
      minify_doctype: o.tricks,
      allow_optimal_entities: o.tricks,
      allow_removing_spaces_between_attributes: o.tricks,
      allow_noncompliant_unquoted_attribute_values: o.tricks,
    }),
  );
