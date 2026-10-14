import wasmUrl from "@minify-html/wasm/index_bg.wasm?url";
import { imports, init } from "../minify.ts";

init((await WebAssembly.instantiateStreaming(fetch(wasmUrl), imports)).instance);
export * from "../minify.ts";
