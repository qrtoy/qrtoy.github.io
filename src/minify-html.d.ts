declare module "@minify-html/wasm/index_bg.js" {
  export function minify(code: Uint8Array, cfg: Record<string, boolean>): Uint8Array;
  export function __wbg_set_wasm(exports: WebAssembly.Exports): void;
}
