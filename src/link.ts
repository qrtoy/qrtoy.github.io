// Turning HTML into the data URL of an app link. Shared by the editor and the build, which puts
// the examples on the about page (vite.config.ts).

export const MAX_BYTES = 2953; // the most a QR code holds

// Steps of the body encoding. Each one percent-encodes a set of characters, or when turned off
// leaves them raw ("raw" steps) or strips them ("strip" steps, for what browsers delete from
// URLs anyway, so raw would give the same page at a higher cost). Turning one off shrinks the
// link, but if the HTML contains those characters, `warn` happens.
export const STEPS = [
  { re: /#/, off: "raw", label: "<code>#</code>", warn: "Cuts off the HTML at the first #." },
  {
    re: /%(?=[\da-f]{2})/,
    off: "raw",
    label: "<code>%XX</code>",
    warn: "Browsers decode it, so %41 becomes A.",
  },
  {
    re: /[\t\n\r]/,
    off: "strip",
    label: "Tabs, newlines",
    warn: "Joins lines: breaks <pre>, // comments and multi-line tags.",
  },
  // only at the very end of the URL, so not when app state follows
  {
    re: / +$/,
    end: true,
    off: "strip",
    label: "Trailing spaces",
    warn: "Drops spaces at the end of the HTML.",
  },
  // controls other than tab and newline aren't deleted by browsers, so they go with non-ASCII
  {
    re: /[^\t\n\r\x20-\x7e]/,
    off: "raw",
    label: "Non-ASCII",
    warn: "Scanners that don't assume UTF-8 may garble it.",
  },
  // What browsers encode in a URL fragment, plus ? so the data URL has no query (Chrome encodes
  // ' in data URL queries). With the steps above, the link is then already in the exact form
  // the browser stores, so an app that writes its location.href back can't change it.
  {
    re: /[ "<>`?]/,
    off: "raw",
    label: "Round-trip safe",
    warn: "Apps that save state to their URL (like notes) can change the link.",
  },
];
export const ALL = STEPS.map(() => true);

// Encode the steps turned on in `on` (by index), strip the other strip steps
export function encode(s: string, on: readonly boolean[] = ALL, state = "") {
  const active = STEPS.map((st) => !st.end || !state);
  STEPS.forEach((st, i) => {
    if (st.off === "strip" && !on[i] && active[i]) s = s.replace(RegExp(st.re, "g"), "");
  });
  const enc = STEPS.filter((_, i) => on[i] && active[i]);
  if (!enc.length) return s;
  // u keeps surrogate pairs as one match
  return s.replace(RegExp(enc.map((st) => st.re.source).join("|"), "giu"), (c) => {
    try {
      return encodeURIComponent(c);
    } catch {
      return "%EF%BF%BD"; // lone surrogate
    }
  });
}

// `body` is `text` encoded
export const toDataUrl = (type: string, text: string, body: string, state = "") =>
  "data:" +
  type +
  // without a charset, data: HTML is decoded as windows-1252, which garbles non-ASCII
  (/[^\x00-\x7f]/.test(text) ? ";charset=utf-8" : "") +
  "," +
  body +
  (state ? "#" + state : "");

export const bytes = (s: string) => new TextEncoder().encode(s).length; // what the QR code holds

// Lenient decode: hand-made links can contain stray % that decodeURIComponent rejects.
const dec = (s: string) =>
  s.replace(/(%[\da-f]{2})+/gi, (m) => {
    try {
      return decodeURIComponent(m);
    } catch {
      return m;
    }
  });

// Split a data URL into the parts the editor shows
export function split(data: string) {
  const m = data.match(/^data:([^,]*),([^#]*)(?:#(.*))?$/s);
  if (!m) return;
  const [, meta, body, st = ""] = m;
  const base64 = /;base64$/i.test(meta);
  return {
    type: meta.replace(/;base64$/i, "").replace(/;charset=[^;]*/i, "") || "text/plain",
    text: base64
      ? new TextDecoder().decode(Uint8Array.from(atob(dec(body)), (c) => c.charCodeAt(0)))
      : dec(body),
    state: st,
    rawQ: body.includes("?"),
  };
}
