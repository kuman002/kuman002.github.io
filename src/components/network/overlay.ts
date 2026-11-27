import type { TelemetryData } from "./types";

export interface TelemetryOverlay {
  el: HTMLDivElement;
  update: (data: TelemetryData) => void;
  setPosition: (x: number, y: number) => void;
  setActive: (active: boolean) => void;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Builds the floating telemetry HUD once and exposes imperative update hooks.
// Replaces the previous React overlay; the scene drives it at frame rate.
export function createTelemetryOverlay(onClose: () => void): TelemetryOverlay {
  const root = el("div", "telemetry-inspection-overlay");
  root.setAttribute("aria-hidden", "true");

  const header = el("div", "telemetry-header");
  const headerLeft = el("div", "telemetry-header-left");
  const led = el("span", "telemetry-led");
  const stagePill = el("span", "telemetry-stage-pill");
  const title = el("span", "telemetry-title");
  headerLeft.append(led, stagePill, title);

  const headerRight = el("div");
  headerRight.style.display = "flex";
  headerRight.style.alignItems = "center";
  headerRight.style.gap = "6px";
  const protocolBadge = el("span", "telemetry-protocol-badge");
  const closeBtn = el("button", "telemetry-close-btn", "×");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Close telemetry overlay");
  closeBtn.addEventListener("click", onClose);
  headerRight.append(protocolBadge, closeBtn);

  header.append(headerLeft, headerRight);

  const body = el("div", "telemetry-body");
  const inputBadge = el("span", "telemetry-badge input-badge", "INPUT");
  const inputCode = el("code", "telemetry-code");
  const inputRow = el("div", "telemetry-row");
  inputRow.append(inputBadge, inputCode);

  const procBadge = el("span", "telemetry-badge proc-badge", "PROC");
  const procCode = el("code", "telemetry-code");
  const procRow = el("div", "telemetry-row");
  procRow.append(procBadge, procCode);

  const outputBadge = el("span", "telemetry-badge output-badge", "OUTPUT");
  const outputCode = el("code", "telemetry-code");
  const outputRow = el("div", "telemetry-row");
  outputRow.append(outputBadge, outputCode);

  body.append(inputRow, procRow, outputRow);

  const footer = el("div", "telemetry-footer");
  const latency = el("span", "telemetry-metric");
  const rate = el("span", "telemetry-metric");
  const security = el("span", "telemetry-metric");
  footer.append(latency, rate, security);

  function setMetric(node: HTMLSpanElement, label: string, value: string) {
    node.replaceChildren(el("strong", undefined, label), document.createTextNode(value));
  }

  root.inert = true;
  root.append(header, body, footer);

  let lastX = Number.NaN;
  let lastY = Number.NaN;

  return {
    el: root,
    update(data) {
      root.style.setProperty("--hud-accent", data.accentColor);
      led.style.background = data.accentColor;
      led.style.boxShadow = `0 0 10px ${data.accentColor}`;
      stagePill.textContent = data.stageNumber;
      title.textContent = data.tag;
      protocolBadge.textContent = data.protocol;
      inputCode.textContent = data.ioSample.input;
      procCode.textContent = data.ioSample.process;
      outputCode.textContent = data.ioSample.output;
      setMetric(latency, "LATENCY:", data.metrics.latency);
      setMetric(rate, "RATE:", data.metrics.throughput);
      setMetric(security, "SEC:", data.metrics.security);
    },
    setPosition(x, y) {
      if (x === lastX && y === lastY) return;
      lastX = x;
      lastY = y;
      root.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    },
    setActive(active) {
      if (!active && root.contains(document.activeElement)) {
        (document.activeElement as HTMLElement).blur();
      }
      root.inert = !active;
      root.classList.toggle("is-active", active);
      root.setAttribute("aria-hidden", active ? "false" : "true");
    },
  };
}
