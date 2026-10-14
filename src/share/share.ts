import { generateToCanvas } from "../fury-qr.ts";
import { split } from "../link.ts";
import "./share.css";

const $ = <K extends keyof HTMLElementTagNameMap = "div">(id: string) =>
  document.getElementById(id) as HTMLElementTagNameMap[K];
const back = $<"a">("back");
const title = $("title");
const qr = $("qr");
const url = $<"a">("url");
const copy = $<"button">("copy");

// same as the app's <title>, like the bootloader (public/index.html) shows
function appTitle(hash: string) {
  try {
    const d = split(hash);
    if (!d) return "broken";
    if (d.type !== "text/html") return "untitled";
    return new DOMParser().parseFromString(d.text, "text/html").title || "untitled";
  } catch {
    return "broken";
  }
}

function render() {
  // same fragment as the app link, so this shows the QR code for /#...
  const hash = location.hash.slice(1);
  title.textContent = appTitle(hash);
  document.title = `share ${title.textContent} - qrtoy`;
  url.textContent = url.href = location.origin + "#" + hash;
  back.href = "/#" + hash;
  try {
    qr.replaceChildren(generateToCanvas(url.textContent, 1000, 0.02));
  } catch {
    qr.textContent = "Too long for a QR code";
  }
}

// back to the app that linked here, or open it when there's nothing to go back to
back.onclick = (e) => {
  if (history.length > 1) {
    e.preventDefault();
    history.back();
  }
};

copy.onclick = async () => {
  await navigator.clipboard.writeText(url.textContent!);
  copy.textContent = "Copied";
  setTimeout(() => (copy.textContent = "Copy link"), 1500);
};

addEventListener("hashchange", render);
render();
