import { generateToCanvas } from "../fury-qr.ts";
import "./about.css";

const viewer = document.querySelector<HTMLDialogElement>(".viewer")!;
const big = viewer.querySelector("canvas")!;
viewer.addEventListener("click", () => viewer.close());

for (const li of document.querySelectorAll(".examples li")) {
  const qr = li.querySelector(".qr")!;
  const hash = li.querySelector("a")!.getAttribute("href")!.slice(1);
  try {
    const canvas = generateToCanvas(location.origin + hash, 1000, 0.02);
    canvas.addEventListener("click", () => {
      big.width = canvas.width;
      big.height = canvas.height;
      big.getContext("2d")!.drawImage(canvas, 0, 0);
      viewer.showModal();
    });
    qr.append(canvas);
  } catch {
    qr.textContent = "Too long for a QR code";
  }
}

navigator.serviceWorker.register("s.js");
