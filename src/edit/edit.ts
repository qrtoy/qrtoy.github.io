import { generateToCanvas } from "../fury-qr.ts";
import { STEPS as BASE_STEPS, bytes, encode, MAX_BYTES, split, toDataUrl } from "../link.ts";
import type { Options } from "../minify.ts";
import "./edit.css";

// This page's fragment is the same as the app link's, so removing "/edit" runs the app.
const BASE = location.origin + "#";
const $ = <K extends keyof HTMLElementTagNameMap = "div">(id: string) =>
  document.getElementById(id) as HTMLElementTagNameMap[K];
const src = $<"textarea">("src");
const out = $<"pre">("out");
const view = $("view");
const readonly = $("readonly");
const sizes = $("sizes");
const state = $<"input">("state");
const preview = $<"iframe">("preview");
const qr = $("qr");
const link = $<"a">("link");
const info = $("info");
const minifyEl = $("minify");
const steps = $("steps");
const copy = $<"button">("copy");

// A row of a settings grid: a choice of two (the first is the default), how much the current
// choice adds to the link compared to the other one, and a warning for when it breaks the HTML.
function row(
  grid: HTMLElement,
  o: { label: string; on: string; off: string; title?: string; warn?: string },
) {
  const name = document.createElement("span");
  name.innerHTML = o.label;
  name.title = o.title ?? o.warn ?? "";
  const seg = document.createElement("span");
  seg.className = "seg";
  const id = grid.id + grid.children.length;
  seg.innerHTML = `<label><input type="radio" name="${id}" checked />${o.on}</label><label><input type="radio" name="${id}" />${o.off}</label>`;
  const status = document.createElement("span");
  status.className = "muted";
  const warnEl = document.createElement("div");
  warnEl.className = "err";
  warnEl.textContent = "⚠ " + (o.warn ?? "");
  warnEl.hidden = true;
  grid.append(name, seg, status, warnEl);
  const [box, alt] = seg.querySelectorAll("input");
  return {
    box,
    status,
    warnEl,
    set: (on: boolean) => ((on ? box : alt).checked = true),
    disable(off: boolean) {
      name.classList.toggle("dim", off);
      box.disabled = alt.disabled = off;
    },
    diff(d: number) {
      status.textContent = !d ? "" : (d > 0 ? "+" : "−") + Math.abs(d) + " B";
    },
  };
}

const MINIFY = (
  [
    {
      key: "html",
      label: "HTML",
      on: "minify",
      off: "raw",
      title: "Collapses whitespace, drops optional quotes and tags",
    },
    { key: "css", label: "CSS", on: "minify", off: "raw", title: "<style> and style attributes" },
    {
      key: "js",
      label: "JS",
      on: "minify",
      off: "raw",
      title: "<script> contents. Comments are kept, so remove them yourself.",
    },
    { key: "stripComments", label: "HTML comments", on: "strip", off: "keep" },
    {
      key: "omitTags",
      label: "Optional tags",
      on: "omit",
      off: "keep",
      title: "</p>, </li>, <html>, <head>, etc.",
    },
    {
      key: "tricks",
      label: "Non-compliant syntax",
      on: "use",
      off: "avoid",
      title:
        "<!doctypehtml>, no spaces between attributes, etc. Browsers accept it, validators don't.",
    },
  ] as const
).map((m) => ({ ...m, ...row(minifyEl, m) }));
type Opts = Record<(typeof MINIFY)[number]["key"], boolean>;
const [html] = MINIFY;
const opts = () => Object.fromEntries(MINIFY.map((m) => [m.key, m.box.checked])) as Opts;

const STEPS = BASE_STEPS.map((step) => ({
  ...step,
  ...row(steps, { ...step, on: step.off === "strip" ? "keep" : "encode" }),
}));
const [, , , , nonAscii, rt] = STEPS;

let type = "text/html";

// The link holds only the minified HTML, so remember the source and options behind the links
// this browser made, keyed by the HTML that reopening the link gives.
type Entry = { key: string; src: string; opts: Opts };
const STORE = "qrtoy-edit";
let saved: Entry[] = [];
try {
  saved = JSON.parse(localStorage.getItem(STORE)!) ?? [];
} catch {}
let current: Entry | undefined; // replaced as the page is edited

function remember(key: string, o: Opts) {
  saved = saved.filter((e) => e !== current && e.key !== key);
  current = { key, src: src.value, opts: o };
  saved.unshift(current);
  saved.length = Math.min(saved.length, 20);
  try {
    localStorage.setItem(STORE, JSON.stringify(saved));
  } catch {}
}

const setOpts = (o: Partial<Opts> = {}) => MINIFY.forEach((m) => m.set(o[m.key] ?? true));

function parse(hash: string) {
  const d = split(hash);
  if (!d) return false;
  type = d.type;
  current = saved.find((e) => e.key === d.text);
  src.value = current?.src ?? d.text;
  if (current) setOpts(current.opts);
  state.value = d.state;
  rt.set(!d.rawQ); // browsers encode the rest on load, so only a raw ? shows it was off
  return true;
}

// Encode the minified HTML into the link, showing what each encoding step does to it
function build(text: string) {
  const on = STEPS.map((st) => st.box.checked);
  const enc = (t: string, o = on) => encode(t, o, state.value);
  const body = enc(text);
  const broken = STEPS.map((st, i) => {
    const other = enc(text, on.with(i, !on[i]));
    st.diff(bytes(body) - bytes(other));
    return bytes(other) !== bytes(body) && !on[i]; // the HTML contains these characters and will change
  });
  // browsers also encode raw controls and non-ASCII in fragments
  if (rt.box.checked && broken[STEPS.indexOf(nonAscii)]) broken[STEPS.indexOf(rt)] = true;
  STEPS.forEach((st, i) => (st.warnEl.hidden = !broken[i]));
  return { data: toDataUrl(type, text, body, state.value), size: (t: string) => bytes(enc(t)) };
}

let minifier: typeof import("./minify-web.ts") | undefined;
const ready = import("./minify-web.ts").then(
  (m) => void (minifier = m),
  (e) => void (html.warnEl.textContent = "⚠ Minifier failed to load: " + e.message),
);

function minify(text: string, o: Opts) {
  if (!o.html || !minifier || type !== "text/html") return { out: text };
  try {
    return { out: minifier.minify(text, o satisfies Options) };
  } catch (e) {
    return { out: text, failed: "⚠ Minifier crashed: " + e };
  }
}

let gen = 0;
async function render() {
  const g = ++gen;
  await ready;
  if (g !== gen) return; // a later render was waiting too
  const o = opts();
  const text = src.value;
  const [cur, ...flipped] = [o, ...MINIFY.map((m) => ({ ...o, [m.key]: !o[m.key] }))].map((v) =>
    minify(text, v),
  );

  out.textContent = cur.out;
  sizes.textContent = bytes(text) + (cur.out !== text ? ` → ${bytes(cur.out)}` : "") + " B";
  const { data, size } = build(cur.out);
  const off = !minifier || type !== "text/html";
  MINIFY.forEach((m, i) => {
    m.disable(off || (m !== html && !o.html));
    m.diff(size(cur.out) - size(flipped[i].out));
  });
  html.warnEl.hidden = !!minifier && !cur.failed;
  if (cur.failed) html.warnEl.textContent = cur.failed;

  const url = BASE + data;
  history.replaceState(null, "", "#" + data);
  remember(split(data)!.text, o);
  link.textContent = link.href = url;
  if (preview.getAttribute("src") !== data) preview.src = data;
  try {
    qr.replaceChildren(generateToCanvas(url, 1000, 0.02));
    info.textContent = `${bytes(url)} bytes`;
    info.className = "";
  } catch {
    qr.replaceChildren();
    info.textContent = `${bytes(url)} bytes · too long for a QR code (max ${MAX_BYTES})`;
    info.className = "err";
  }
}

let timer: number | undefined;
const schedule = () => {
  clearTimeout(timer);
  timer = setTimeout(render, 300);
};
src.oninput = state.oninput = schedule;
minifyEl.onchange = steps.onchange = render;

view.onchange = () => {
  const showPreview = view.querySelector("input")!.checked;
  preview.hidden = !showPreview;
  out.hidden = readonly.hidden = showPreview;
};

// Tab indents instead of leaving the textarea (execCommand keeps undo working)
src.onkeydown = (e) => {
  if (e.key === "Tab" && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
    e.preventDefault();
    document.execCommand("insertText", false, "\t");
  }
};

copy.onclick = async () => {
  await navigator.clipboard.writeText(link.href); // href is browser-encoded (no raw spaces), safer to paste
  copy.textContent = "Copied";
  setTimeout(() => (copy.textContent = "Copy link"), 1500);
};

function load() {
  try {
    if (parse(location.hash.slice(1))) return;
  } catch {}
  src.value = "<h1>hello world</h1>";
}
addEventListener("hashchange", () => {
  load();
  render();
});
setOpts(saved[0]?.opts); // the last options used
load();
info.textContent = "Loading minifier…";
render();
