import { PIPELINE_CONFIG, REQ_LABELS, RES_LABELS } from "./config";
import { getCubicBezierPoint } from "./geometry";
import type { TelemetryOverlay } from "./overlay";
import type { ModuleRenderData, NeuralNode, PipelineModule, TelemetryData } from "./types";

export interface NetworkScene {
  start: () => void;
  pause: () => void;
  resume: () => void;
  destroy: () => void;
  dismiss: () => void;
}

// Framework-agnostic canvas scene. Owns all state, the render loop and the
// telemetry overlay; the caller only wires it to a canvas + overlay element.
export function createNetworkScene(
  canvas: HTMLCanvasElement,
  overlay: TelemetryOverlay,
): NetworkScene {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) {
    return { start() {}, pause() {}, resume() {}, destroy() {}, dismiss() {} };
  }
  const ctx = maybeCtx;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let started = false;
  let width = 0;
  let height = 0;
  let docHeight = 4500;
  let animationId = 0;
  let isVisible = !document.hidden;
  let lastInteraction = performance.now();
  let lastDraw = 0;
  let resizeObserver: ResizeObserver | null = null;

  let activeData: TelemetryData | null = null;
  let isOverOverlay = false;
  let dismissTimeout: ReturnType<typeof setTimeout> | null = null;

  function updateDocHeight() {
    docHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, 4500);
  }

  function schedule() {
    if (!animationId && isVisible) animationId = requestAnimationFrame(render);
  }

  // Full frame rate while the user scrolls/points; reduced motion only redraws on these events.
  function wake() {
    lastInteraction = performance.now();
    schedule();
  }

  // Smooth scroll interpolation
  let scrollCurrent = window.scrollY;

  function handleScroll() {
    wake();
  }

  // Subtle mouse parallax & position tracking
  const mouse = {
    x: -1000,
    y: -1000,
    targetX: 0,
    targetY: 0,
    currentX: 0,
    currentY: 0,
    radius: 160,
  };

  function handleMouseMove(e: MouseEvent) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 18;
    mouse.targetY = (e.clientY / window.innerHeight - 0.5) * 14;
    wake();
  }

  function handleMouseLeave() {
    mouse.x = -1000;
    mouse.y = -1000;
    mouse.targetX = 0;
    mouse.targetY = 0;
    wake();
  }

  function handleTouch(e: TouchEvent) {
    if (e.touches && e.touches.length > 0) {
      mouse.x = e.touches[0].clientX;
      mouse.y = e.touches[0].clientY;
    }
    wake();
  }

  // Neural Nodes state
  const neuralNodes: NeuralNode[] = [];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Re-populate neural nodes with lighter depth factors (lower density)
    const targetCount = width < 768 ? 16 : 24;
    neuralNodes.length = 0;

    for (let i = 0; i < targetCount; i++) {
      const isNeuronCore = i % 7 === 0;
      const z = 0.6 + Math.random() * 1.0;
      const initialY = Math.random() * (height + 300) - 150;

      neuralNodes.push({
        x: Math.random() * width,
        baseY: initialY,
        y: initialY,
        z,
        vx: (Math.random() - 0.5) * (prefersReducedMotion ? 0 : 0.2),
        vy: (Math.random() - 0.5) * (prefersReducedMotion ? 0 : 0.15),
        radius: isNeuronCore ? 2.0 * z : (1.1 + Math.random() * 0.5) * z,
        baseAlpha: isNeuronCore ? 0.45 : 0.12 + Math.random() * 0.15,
        pulseSpeed: 1.0 + Math.random() * 1.2,
        pulsePhase: Math.random() * Math.PI * 2,
        isNeuronCore,
      });
    }
    updateDocHeight();
    wake();
  }

  // Instantiate architecture modules state
  const modules: PipelineModule[] = PIPELINE_CONFIG.map((m) => ({
    ...m,
    activeGlow: 0,
    statusText: m.protocol,
  }));

  let lastTime = performance.now();

  function render(now: number) {
    animationId = 0;
    if (!isVisible) return;

    if (!prefersReducedMotion) {
      animationId = requestAnimationFrame(render);
      // Idle for 1.5s: drop to ~30fps to save CPU/battery.
      if (now - lastInteraction > 1500 && now - lastDraw < 32) return;
    }
    lastDraw = now;

    const delta = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    // Responsive smooth scroll lerp: tightly bound to scroll without sluggish delay
    scrollCurrent += (window.scrollY - scrollCurrent) * (prefersReducedMotion ? 1 : 0.28);

    // Smooth mouse parallax
    const mouseLerp = prefersReducedMotion ? 1 : 0.05;
    mouse.currentX += (mouse.targetX - mouse.currentX) * mouseLerp;
    mouse.currentY += (mouse.targetY - mouse.currentY) * mouseLerp;

    ctx.clearRect(0, 0, width, height);

    // ========================================================
    // 1. DIGITAL SCHEMATIC GRID (Moves with scroll)
    // ========================================================
    const gridSize = 64;
    const gridOffsetY = (scrollCurrent * 0.25) % gridSize;

    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(56, 189, 248, 0.045)";
    const crossSize = 3;
    ctx.beginPath(); // one path for all crosses: a single stroke() instead of ~500
    for (let x = gridSize; x < width; x += gridSize) {
      for (let y = gridSize - gridOffsetY; y < height; y += gridSize) {
        ctx.moveTo(x - crossSize, y);
        ctx.lineTo(x + crossSize, y);
        ctx.moveTo(x, y - crossSize);
        ctx.lineTo(x, y + crossSize);
      }
    }
    ctx.stroke();

    // ========================================================
    // 2. NEURAL NETWORK ANIMATION (Synaptic Graph & Parallax)
    // ========================================================
    const tSeconds = now / 1000;
    const loopHeight = height + 320;

    for (let i = 0; i < neuralNodes.length; i++) {
      const node = neuralNodes[i];

      if (!prefersReducedMotion) {
        node.x += node.vx;
        node.baseY += node.vy;

        if (node.x < 0) node.x = width;
        else if (node.x > width) node.x = 0;
      }

      const parallaxY = -scrollCurrent * (0.08 + node.z * 0.12);
      let rawY = (node.baseY + parallaxY) % loopHeight;
      if (rawY < -150) rawY += loopHeight;
      node.y = rawY;
    }

    // Draw Synapses between nearby nodes (light airy web)
    const synapseDistance = 90;
    for (let i = 0; i < neuralNodes.length; i++) {
      const n1 = neuralNodes[i];
      for (let j = i + 1; j < neuralNodes.length; j++) {
        const n2 = neuralNodes[j];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dist = Math.hypot(dx, dy);

        if (dist < synapseDistance) {
          const alpha = (1 - dist / synapseDistance) * 0.08 * Math.min(n1.z, n2.z);
          ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(n1.x, n1.y);
          ctx.lineTo(n2.x, n2.y);
          ctx.stroke();
        }
      }

      // Mouse Ingress Link
      const mdx = mouse.x - n1.x;
      const mdy = mouse.y - n1.y;
      const mDist = Math.hypot(mdx, mdy);
      if (mDist < mouse.radius) {
        const mAlpha = (1 - mDist / mouse.radius) * 0.24;
        ctx.strokeStyle = `rgba(56, 189, 248, ${mAlpha})`;
        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.stroke();
      }
    }

    // Draw Neural Nodes
    for (let i = 0; i < neuralNodes.length; i++) {
      const node = neuralNodes[i];
      const pulse = Math.sin(tSeconds * node.pulseSpeed + node.pulsePhase);
      const currentAlpha = Math.max(0.08, node.baseAlpha + pulse * 0.12);

      if (node.isNeuronCore) {
        ctx.fillStyle = `rgba(56, 189, 248, ${currentAlpha * 0.25})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 2.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(129, 140, 248, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(56, 189, 248, ${currentAlpha * 0.75})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ========================================================
    // 3. ARCHITECTURE PIPELINE (CALCULATE POSITIONS SAFELY)
    // ========================================================
    const isMobile = width < 768;
    const leftInset = isMobile ? 16 : Math.max(32, width * 0.06);
    const rightInset = isMobile ? 16 : Math.max(32, width * 0.06);

    const maxScroll = Math.max(1, docHeight - height);
    const scrollFraction = Math.min(1, Math.max(0, scrollCurrent / maxScroll));

    const targetDisplacement = Math.max(1200, 2820 - height * 0.45);
    const scrollDisplacement = scrollFraction * targetDisplacement;

    const renderedModules: ModuleRenderData[] = modules.map((m) => {
      const yPos = m.initialY - scrollDisplacement;

      let xPos =
        m.align === "left"
          ? leftInset + mouse.currentX * 0.3
          : width - m.width - rightInset + mouse.currentX * 0.3;

      xPos = Math.max(12, Math.min(width - m.width - 12, xPos));

      const cx = xPos + m.width * 0.5;
      const cy = yPos + m.height * 0.5;
      const isModuleVisible = yPos > -140 && yPos < height + 140;
      const isFocused = cy > height * 0.22 && cy < height * 0.68;

      if (m.activeGlow > 0) {
        m.activeGlow = Math.max(0, m.activeGlow - delta);
        if (m.activeGlow <= 0) {
          m.statusText = m.protocol;
        }
      }

      return {
        m,
        x: xPos,
        y: yPos,
        cx,
        cy,
        w: m.width,
        h: m.height,
        isVisible: isModuleVisible,
        isFocused,
      };
    });

    // ========================================================
    // 4. DRAW DUAL CONDUITS
    // ========================================================
    for (let i = 0; i < renderedModules.length - 1; i++) {
      const from = renderedModules[i];
      const to = renderedModules[i + 1];

      if (!from.isVisible && !to.isVisible) continue;

      const midY = (from.cy + to.cy) * 0.5;

      const reqP0x = from.cx;
      const reqP0y = from.cy - 3.5;
      const reqP1x = from.cx;
      const reqP1y = midY - 3.5;
      const reqP2x = to.cx;
      const reqP2y = midY - 3.5;
      const reqP3x = to.cx;
      const reqP3y = to.cy - 3.5;

      const resP0x = to.cx;
      const resP0y = to.cy + 3.5;
      const resP1x = to.cx;
      const resP1y = midY + 3.5;
      const resP2x = from.cx;
      const resP2y = midY + 3.5;
      const resP3x = from.cx;
      const resP3y = from.cy + 3.5;

      ctx.strokeStyle = "rgba(56, 189, 248, 0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(reqP0x, reqP0y);
      ctx.bezierCurveTo(reqP1x, reqP1y, reqP2x, reqP2y, reqP3x, reqP3y);
      ctx.stroke();

      ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 24]);
      ctx.lineDashOffset = -(scrollCurrent * 0.2);
      ctx.beginPath();
      ctx.moveTo(reqP0x, reqP0y);
      ctx.bezierCurveTo(reqP1x, reqP1y, reqP2x, reqP2y, reqP3x, reqP3y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = "rgba(129, 140, 248, 0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(resP0x, resP0y);
      ctx.bezierCurveTo(resP1x, resP1y, resP2x, resP2y, resP3x, resP3y);
      ctx.stroke();

      ctx.strokeStyle = "rgba(129, 140, 248, 0.45)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 24]);
      ctx.lineDashOffset = scrollCurrent * 0.2;
      ctx.beginPath();
      ctx.moveTo(resP0x, resP0y);
      ctx.bezierCurveTo(resP1x, resP1y, resP2x, resP2y, resP3x, resP3y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
      ctx.beginPath();
      ctx.arc(reqP0x, reqP0y, 1.2, 0, Math.PI * 2);
      ctx.arc(reqP3x, reqP3y, 1.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(129, 140, 248, 0.35)";
      ctx.beginPath();
      ctx.arc(resP0x, resP0y, 1.2, 0, Math.PI * 2);
      ctx.arc(resP3x, resP3y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Extended Top Ingress Line (feeding into API_GATEWAY)
    const firstMod = renderedModules[0];
    if (firstMod && (firstMod.isVisible || firstMod.y > -250)) {
      const inStartX = firstMod.cx + 35;
      const inStartY = firstMod.cy - 240;
      const inEndX = firstMod.cx;
      const inEndY = firstMod.cy - 3.5;

      const inGrad = ctx.createLinearGradient(inStartX, inStartY, inEndX, inEndY);
      inGrad.addColorStop(0, "rgba(56, 189, 248, 0)");
      inGrad.addColorStop(1, "rgba(56, 189, 248, 0.35)");

      ctx.strokeStyle = inGrad;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 24]);
      ctx.lineDashOffset = -(scrollCurrent * 0.2);
      ctx.beginPath();
      ctx.moveTo(inStartX, inStartY);
      ctx.bezierCurveTo(inStartX, inStartY + 80, inEndX, inEndY - 80, inEndX, inEndY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Extended Bottom Egress Line (flowing spaciously past EGRESS_OUTPUT)
    const lastMod = renderedModules[renderedModules.length - 1];
    if (lastMod && (lastMod.isVisible || lastMod.y < height + 250)) {
      const egStartX = lastMod.cx;
      const egStartY = lastMod.cy + 3.5;
      const egEndX = lastMod.cx - 45;
      const egEndY = lastMod.cy + 280;

      const egGrad = ctx.createLinearGradient(egStartX, egStartY, egEndX, egEndY);
      egGrad.addColorStop(0, "rgba(129, 140, 248, 0.45)");
      egGrad.addColorStop(1, "rgba(129, 140, 248, 0)");

      ctx.strokeStyle = egGrad;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 24]);
      ctx.lineDashOffset = -(scrollCurrent * 0.2);
      ctx.beginPath();
      ctx.moveTo(egStartX, egStartY);
      ctx.bezierCurveTo(egStartX, egStartY + 100, egEndX, egEndY - 100, egEndX, egEndY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ========================================================
    // 5. ANIMATE REQUEST & RESPONSE SIGNALS
    // ========================================================
    const totalStages = renderedModules.length - 1; // 7 stages across 8 modules
    const globalProgress = Math.min(totalStages - 0.001, Math.max(0, scrollFraction * totalStages));

    // Dynamic Module Proximity: Illuminate modules as the request passes through them
    renderedModules.forEach((rm, idx) => {
      const dist = Math.abs(globalProgress - idx);
      if (dist < 0.45) {
        const glowIntensity = 1 - dist / 0.45;
        rm.m.activeGlow = glowIntensity * 0.9;
        if (idx === totalStages) {
          rm.m.statusText = "EGRESS_DONE 200";
        } else if (idx === 0) {
          rm.m.statusText = "INGRESS_ACTIVE";
        } else {
          rm.m.statusText = "PROCESSING...";
        }
      } else if (rm.m.activeGlow > 0) {
        rm.m.activeGlow = Math.max(0, rm.m.activeGlow - delta * 2.0);
        if (rm.m.activeGlow <= 0) {
          rm.m.statusText = rm.m.protocol;
        }
      }
    });

    function drawSignalPacket(
      stageIdx: number,
      direction: 1 | -1,
      progress: number,
      label: string,
    ) {
      if (stageIdx < 0 || stageIdx >= totalStages) return;
      const from = renderedModules[stageIdx];
      const to = renderedModules[stageIdx + 1];
      if (!from || !to) return;

      const midY = (from.cy + to.cy) * 0.5;
      let p0x: number,
        p0y: number,
        p1x: number,
        p1y: number,
        p2x: number,
        p2y: number,
        p3x: number,
        p3y: number;

      if (direction === 1) {
        p0x = from.cx;
        p0y = from.cy - 3.5;
        p1x = from.cx;
        p1y = midY - 3.5;
        p2x = to.cx;
        p2y = midY - 3.5;
        p3x = to.cx;
        p3y = to.cy - 3.5;
      } else {
        p0x = to.cx;
        p0y = to.cy + 3.5;
        p1x = to.cx;
        p1y = midY + 3.5;
        p2x = from.cx;
        p2y = midY + 3.5;
        p3x = from.cx;
        p3y = from.cy + 3.5;
      }

      const isOutput = direction === -1;
      const ptHead = getCubicBezierPoint(p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, progress);
      const ptTail1 = getCubicBezierPoint(
        p0x,
        p0y,
        p1x,
        p1y,
        p2x,
        p2y,
        p3x,
        p3y,
        Math.max(0, progress - 0.035),
      );
      const ptTail2 = getCubicBezierPoint(
        p0x,
        p0y,
        p1x,
        p1y,
        p2x,
        p2y,
        p3x,
        p3y,
        Math.max(0, progress - 0.07),
      );

      if (ptHead.y > -25 && ptHead.y < height + 25) {
        ctx.fillStyle = isOutput ? "rgba(129, 140, 248, 0.16)" : "rgba(56, 189, 248, 0.15)";
        ctx.beginPath();
        ctx.arc(ptTail2.x, ptTail2.y, 1.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isOutput ? "rgba(165, 180, 252, 0.35)" : "rgba(125, 211, 252, 0.38)";
        ctx.beginPath();
        ctx.arc(ptTail1.x, ptTail1.y, 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isOutput ? "rgba(129, 140, 248, 0.3)" : "rgba(56, 189, 248, 0.32)";
        ctx.beginPath();
        ctx.arc(ptHead.x, ptHead.y, 6.0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isOutput ? "#c7d2fe" : "#ffffff";
        ctx.beginPath();
        ctx.arc(ptHead.x, ptHead.y, 2.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = "500 7.5px 'DM Mono', monospace";
        const textW = ctx.measureText(label).width;
        const chipX = ptHead.x + 8;
        const chipY = ptHead.y - 6;

        ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
        ctx.strokeStyle = isOutput ? "rgba(129, 140, 248, 0.4)" : "rgba(56, 189, 248, 0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(chipX - 3, chipY, textW + 6, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isOutput ? "#c7d2fe" : "#bae6fd";
        ctx.fillText(label, chipX, ptHead.y + 2.5);
      }
    }

    const reqStage = Math.min(totalStages - 1, Math.floor(globalProgress));
    const reqProg = globalProgress - reqStage;
    drawSignalPacket(reqStage, 1, reqProg, REQ_LABELS[reqStage] || "REQ: INGRESS");

    const resStage = (reqStage + 4) % totalStages;
    const resProg = 1 - reqProg;
    drawSignalPacket(resStage, -1, resProg, RES_LABELS[resStage] || "RES: 200 OK");

    const secReqStage = (reqStage + 2) % totalStages;
    const secReqProg = (reqProg + 0.5) % 1;
    drawSignalPacket(secReqStage, 1, secReqProg, REQ_LABELS[secReqStage] || "REQ: PIPELINE");

    const secResStage = (reqStage + 1) % totalStages;
    const secResProg = (1 - reqProg + 0.5) % 1;
    drawSignalPacket(secResStage, -1, secResProg, RES_LABELS[secResStage] || "RES: PIPELINE");

    // ========================================================
    // 6. DRAW ALL SERVERLESS ARCHITECTURE MODULE CARDS
    // ========================================================
    renderedModules.forEach((rm) => {
      if (!rm.isVisible) return;

      const { m, x, y, w, h } = rm;
      const isHovered = activeData?.id === m.id;
      const isProcessing = m.activeGlow > 0;
      const glowRatio = m.activeGlow / 0.85;

      ctx.fillStyle = isHovered
        ? `rgba(16, 28, 52, 0.96)`
        : isProcessing
          ? `rgba(16, 32, 54, ${0.88 + glowRatio * 0.12})`
          : "rgba(10, 16, 26, 0.90)";

      ctx.strokeStyle = isHovered
        ? m.accentColor
        : isProcessing
          ? `rgba(56, 189, 248, ${0.7 + glowRatio * 0.3})`
          : `${m.accentColor}77`;
      ctx.lineWidth = isHovered ? 2.2 : isProcessing ? 1.8 : 1.2;

      const r = 8;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = isHovered || isProcessing ? "#ffffff" : m.accentColor;
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(x, y + 6);
      ctx.lineTo(x, y);
      ctx.lineTo(x + 6, y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x + w, y + h - 6);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x + w - 6, y + h);
      ctx.stroke();

      const ledColor = isProcessing ? "#38bdf8" : m.accentColor;
      ctx.fillStyle = ledColor;
      ctx.beginPath();
      ctx.arc(x + 12, y + 15, isProcessing || isHovered ? 3.5 : 2.5, 0, Math.PI * 2);
      ctx.fill();

      if (isProcessing) {
        ctx.strokeStyle = `rgba(56, 189, 248, ${glowRatio * 0.7})`;
        ctx.beginPath();
        ctx.arc(x + 12, y + 15, 7.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.font = "600 9px 'DM Mono', monospace";
      ctx.fillStyle = isHovered
        ? m.accentColor
        : isProcessing
          ? "#38bdf8"
          : "rgba(148, 163, 184, 0.85)";
      ctx.fillText(m.statusText, x + 22, y + 18);

      ctx.font = "600 11px 'DM Mono', monospace";
      ctx.fillStyle = isHovered || isProcessing ? "#ffffff" : "#f1f5f9";
      ctx.fillText(m.tag, x + 12, y + 39);

      ctx.font = "500 10px 'DM Mono', monospace";
      ctx.fillStyle = m.accentColor;
      ctx.fillText(m.sub, x + 12, y + 57);
    });

    // ========================================================
    // 7. MODULE HOVER INSPECTION & TELEMETRY HUD SYNC
    // ========================================================
    let hoveredRm: ModuleRenderData | null = null;
    if (mouse.x > 0 && mouse.y > 0) {
      for (let i = 0; i < renderedModules.length; i++) {
        const rm = renderedModules[i];
        if (!rm.isVisible) continue;
        if (
          mouse.x >= rm.x - 10 &&
          mouse.x <= rm.x + rm.w + 10 &&
          mouse.y >= rm.y - 10 &&
          mouse.y <= rm.y + rm.h + 10
        ) {
          hoveredRm = rm;
          break;
        }
      }
    }

    if (hoveredRm) {
      if (dismissTimeout) {
        clearTimeout(dismissTimeout);
        dismissTimeout = null;
      }

      if (activeData?.id !== hoveredRm.m.id) {
        activeData = {
          id: hoveredRm.m.id,
          stageNumber: hoveredRm.m.stageNumber,
          tag: hoveredRm.m.tag,
          sub: hoveredRm.m.sub,
          protocol: hoveredRm.m.protocol,
          accentColor: hoveredRm.m.accentColor,
          ioSample: hoveredRm.m.ioSample,
          metrics: hoveredRm.m.metrics,
        };
        overlay.update(activeData);
        overlay.setActive(true);
      }
    } else if (!isOverOverlay && activeData) {
      if (!dismissTimeout) {
        dismissTimeout = setTimeout(() => {
          activeData = null;
          overlay.setActive(false);
          dismissTimeout = null;
          schedule();
        }, 200);
      }
    }

    if (activeData) {
      const activeId = activeData.id;
      const activeMod = renderedModules.find((rm) => rm.m.id === activeId);

      if (activeMod && activeMod.isVisible) {
        const boxWidth = Math.min(340, width - 24);
        const boxHeight = 160;

        let targetX: number;
        let targetY: number;

        if (width < 768) {
          targetX = Math.max(12, (width - boxWidth) * 0.5);
          if (activeMod.y + activeMod.h + boxHeight + 16 < height) {
            targetY = activeMod.y + activeMod.h + 12;
          } else {
            targetY = Math.max(12, activeMod.y - boxHeight - 12);
          }
        } else {
          if (activeMod.m.align === "left") {
            targetX = activeMod.x + activeMod.w + 16;
            if (targetX + boxWidth > width - 12) {
              targetX = Math.max(12, width - boxWidth - 12);
            }
          } else {
            targetX = activeMod.x - boxWidth - 16;
            if (targetX < 12) {
              targetX = 12;
            }
          }
          targetY = activeMod.y + activeMod.h * 0.5 - boxHeight * 0.5;
        }

        targetX = Math.max(12, Math.min(width - boxWidth - 12, targetX));
        targetY = Math.max(12, Math.min(height - boxHeight - 12, targetY));

        overlay.setPosition(targetX, targetY);

        const fromAnchorX = activeMod.m.align === "left" ? activeMod.x + activeMod.w : activeMod.x;
        const fromAnchorY = activeMod.cy;
        const toAnchorX = activeMod.m.align === "left" ? targetX : targetX + boxWidth;
        const toAnchorY = Math.max(targetY + 16, Math.min(targetY + boxHeight - 16, activeMod.cy));

        ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(fromAnchorX, fromAnchorY);
        ctx.lineTo(toAnchorX, toAnchorY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = activeData.accentColor;
        ctx.beginPath();
        ctx.arc(fromAnchorX, fromAnchorY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function onVisibilityChange() {
    isVisible = !document.hidden;
    if (isVisible && !animationId) {
      lastTime = performance.now();
      schedule();
    } else if (!isVisible && animationId) {
      cancelAnimationFrame(animationId);
      animationId = 0;
    }
  }

  function onOverlayEnter() {
    isOverOverlay = true;
    if (dismissTimeout) {
      clearTimeout(dismissTimeout);
      dismissTimeout = null;
    }
  }

  function onOverlayLeave() {
    isOverOverlay = false;
  }

  function start() {
    if (started) return;
    started = true;
    resize();
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updateDocHeight);
      resizeObserver.observe(document.documentElement);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave, { passive: true });
    window.addEventListener("touchstart", handleTouch, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    overlay.el.addEventListener("mouseenter", onOverlayEnter);
    overlay.el.addEventListener("mouseleave", onOverlayLeave);
    schedule();
  }

  function pause() {
    cancelAnimationFrame(animationId);
    animationId = 0;
    if (dismissTimeout) {
      clearTimeout(dismissTimeout);
      dismissTimeout = null;
    }
  }

  function resume() {
    if (!started) return;
    isVisible = !document.hidden;
    lastTime = performance.now();
    resize();
  }

  function destroy() {
    if (!started) return;
    started = false;
    pause();
    resizeObserver?.disconnect();
    resizeObserver = null;
    window.removeEventListener("scroll", handleScroll);
    window.removeEventListener("resize", resize);
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseleave", handleMouseLeave);
    window.removeEventListener("touchstart", handleTouch);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    overlay.el.removeEventListener("mouseenter", onOverlayEnter);
    overlay.el.removeEventListener("mouseleave", onOverlayLeave);
    canvas.remove();
    overlay.el.remove();
  }

  function dismiss() {
    if (dismissTimeout) {
      clearTimeout(dismissTimeout);
      dismissTimeout = null;
    }
    isOverOverlay = false;
    activeData = null;
    mouse.x = -1000;
    mouse.y = -1000;
    overlay.setActive(false);
    schedule();
  }

  return { start, pause, resume, destroy, dismiss };
}
