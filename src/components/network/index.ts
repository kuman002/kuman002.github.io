import { createTelemetryOverlay } from "./overlay";
import { createNetworkScene } from "./scene";

// Mounts the animated network background (canvas + telemetry HUD) into <body>.
// Vanilla DOM/TS — no framework runtime shipped to the client.
export function initNetworkBackground() {
  if (typeof document === "undefined") return;

  const canvas = document.createElement("canvas");
  canvas.className = "network-bg-canvas";
  canvas.setAttribute("aria-hidden", "true");

  let dismiss = () => {};
  const overlay = createTelemetryOverlay(() => dismiss());

  document.body.prepend(canvas);
  document.body.append(overlay.el);

  const scene = createNetworkScene(canvas, overlay);
  dismiss = () => scene.dismiss();
  scene.start();

  const onPageHide = (e: PageTransitionEvent) => {
    if (e.persisted) {
      scene.pause();
    } else {
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      scene.destroy();
    }
  };

  const onPageShow = (e: PageTransitionEvent) => {
    if (e.persisted) {
      scene.resume();
    }
  };

  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("pageshow", onPageShow);
}
