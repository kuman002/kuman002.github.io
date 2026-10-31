import React, { useEffect, useRef } from "react";

// ----------------------------------------------------
// Neural Network Synapse Node Definition
// ----------------------------------------------------
interface NeuralNode {
  x: number;
  baseY: number;
  y: number;
  z: number; // Parallax depth factor
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
  pulseSpeed: number;
  pulsePhase: number;
  isNeuronCore?: boolean;
}

// ----------------------------------------------------
// Architecture Pipeline Module Definition
// ----------------------------------------------------
interface PipelineModule {
  id: number;
  align: "left" | "right";
  initialY: number;
  width: number;
  height: number;
  tag: string;
  sub: string;
  protocol: string;
  accentColor: string;
  activeGlow: number; // Duration countdown for processing flash
  statusText: string;
}

interface SignalPacket {
  id: number;
  stageIndex: number; // 0 to 6 (the leg between module stageIndex and stageIndex + 1)
  direction: 1 | -1;  // 1 = forward request (down), -1 = return response (up)
  progress: number;
  color: string;
  label: string;
}

const PIPELINE_CONFIG = [
  {
    id: 0,
    align: "left" as const,
    initialY: 160,
    width: 155,
    height: 74,
    tag: "API_GATEWAY",
    sub: "REST // HTTPS",
    protocol: "INGRESS",
    accentColor: "#38bdf8",
  },
  {
    id: 1,
    align: "right" as const,
    initialY: 560,
    width: 155,
    height: 74,
    tag: "AUTH_COGNITO",
    sub: "JWT VERIFIED",
    protocol: "SECURITY",
    accentColor: "#818cf8",
  },
  {
    id: 2,
    align: "left" as const,
    initialY: 960,
    width: 155,
    height: 74,
    tag: "LAMBDA_POOL",
    sub: "V8 NODE.JS@22",
    protocol: "COMPUTE",
    accentColor: "#38bdf8",
  },
  {
    id: 3,
    align: "right" as const,
    initialY: 1360,
    width: 155,
    height: 74,
    tag: "POSTGRES_RDS",
    sub: "pgvector // CDC",
    protocol: "DATABASE",
    accentColor: "#38bdf8",
  },
  {
    id: 4,
    align: "left" as const,
    initialY: 1760,
    width: 155,
    height: 74,
    tag: "REDIS_BULLMQ",
    sub: "LOW_LATENCY",
    protocol: "CACHE_QUEUE",
    accentColor: "#f43f5e",
  },
  {
    id: 5,
    align: "right" as const,
    initialY: 2160,
    width: 155,
    height: 74,
    tag: "ZERO_TRUST_KMS",
    sub: "AES-256-GCM",
    protocol: "ENCRYPTION",
    accentColor: "#38bdf8",
  },
  {
    id: 6,
    align: "left" as const,
    initialY: 2560,
    width: 160,
    height: 74,
    tag: "LANGGRAPH_RAG",
    sub: "AGENTIC_SYNTHESIS",
    protocol: "AI_RAG_FLOW",
    accentColor: "#a855f7",
  },
  {
    id: 7,
    align: "right" as const,
    initialY: 2960,
    width: 160,
    height: 74,
    tag: "EGRESS_OUTPUT",
    sub: "STREAM_DONE",
    protocol: "OUTPUT_200",
    accentColor: "#818cf8",
  },
];

// Cubic Bezier calculation
function getCubicBezierPoint(
  p0x: number, p0y: number,
  p1x: number, p1y: number,
  p2x: number, p2y: number,
  p3x: number, p3y: number,
  t: number
): { x: number; y: number } {
  const clampT = Math.max(0, Math.min(1, t));
  const oneMinusT = 1 - clampT;
  const a = oneMinusT * oneMinusT * oneMinusT;
  const b = 3 * oneMinusT * oneMinusT * clampT;
  const c = 3 * oneMinusT * clampT * clampT;
  const d = clampT * clampT * clampT;

  return {
    x: a * p0x + b * p1x + c * p2x + d * p3x,
    y: a * p0y + b * p1y + c * p2y + d * p3y,
  };
}

export const NetworkBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let animationId = 0;
    let isVisible = !document.hidden;

    // Smooth scroll interpolation
    let scrollTarget = window.scrollY;
    let scrollCurrent = window.scrollY;

    function handleScroll() {
      scrollTarget = window.scrollY;
    }
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Subtle mouse parallax
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
    }

    function handleMouseLeave() {
      mouse.x = -1000;
      mouse.y = -1000;
      mouse.targetX = 0;
      mouse.targetY = 0;
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave, { passive: true });

    // Neural Nodes state
    const neuralNodes: NeuralNode[] = [];

    function resize() {
      if (!canvas || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);

      // Re-populate neural nodes with depth factors
      const targetCount = width < 768 ? 24 : 42;
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
          vx: (Math.random() - 0.5) * (prefersReducedMotion ? 0 : 0.25),
          vy: (Math.random() - 0.5) * (prefersReducedMotion ? 0 : 0.18),
          radius: isNeuronCore ? 2.5 * z : (1.3 + Math.random() * 0.6) * z,
          baseAlpha: isNeuronCore ? 0.6 : 0.18 + Math.random() * 0.2,
          pulseSpeed: 1.1 + Math.random() * 1.4,
          pulsePhase: Math.random() * Math.PI * 2,
          isNeuronCore,
        });
      }
    }

    resize();
    window.addEventListener("resize", resize);

    // Instantiate architecture modules state
    const modules: PipelineModule[] = PIPELINE_CONFIG.map((m) => ({
      ...m,
      activeGlow: 0,
      statusText: m.protocol,
    }));

    // Signals lifecycle: Process moves ONLY when scrolling!
    // When the user stops scrolling, the process packets freeze in place on the line or inside a module
    const signals: SignalPacket[] = [
      // Forward Request Signals (distributed across stages)
      { id: 1, stageIndex: 0, direction: 1, progress: 0.35, color: "#38bdf8", label: "REQ: INGRESS" },
      { id: 2, stageIndex: 2, direction: 1, progress: 0.65, color: "#818cf8", label: "REQ: SQL_QUERY" },
      { id: 3, stageIndex: 4, direction: 1, progress: 0.40, color: "#38bdf8", label: "REQ: VECTOR_RAG" },

      // Return Response Signals (Theme Soft Indigo #818cf8)
      { id: 4, stageIndex: 6, direction: -1, progress: 0.50, color: "#818cf8", label: "RES: RAG_STREAM" },
      { id: 5, stageIndex: 3, direction: -1, progress: 0.75, color: "#818cf8", label: "RES: 200 OK" },
      { id: 6, stageIndex: 1, direction: -1, progress: 0.25, color: "#818cf8", label: "RES: DISPATCHED" },
    ];

    let lastTime = performance.now();
    let prevScrollCurrent = window.scrollY;

    function render(now: number) {
      animationId = 0;
      if (!isVisible || !ctx) return;

      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      animationId = requestAnimationFrame(render);

      // Direct sampling of window.scrollY each frame
      const currentScrollY = window.scrollY;

      // Responsive smooth scroll lerp: tightly bound to scroll without sluggish delay
      scrollCurrent += (currentScrollY - scrollCurrent) * (prefersReducedMotion ? 1 : 0.28);

      // Exact scroll movement delta: only non-zero when the user is actively scrolling!
      const smoothDelta = scrollCurrent - prevScrollCurrent;
      prevScrollCurrent = scrollCurrent;

      // Smooth mouse parallax
      mouse.currentX += (mouse.targetX - mouse.currentX) * 0.05;
      mouse.currentY += (mouse.targetY - mouse.currentY) * 0.05;

      ctx.clearRect(0, 0, width, height);

      // ========================================================
      // 1. DIGITAL SCHEMATIC GRID (Moves with scroll)
      // ========================================================
      const gridSize = 64;
      const gridOffsetY = (scrollCurrent * 0.25) % gridSize;

      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(56, 189, 248, 0.045)";
      const crossSize = 3;
      for (let x = gridSize; x < width; x += gridSize) {
        for (let y = gridSize - gridOffsetY; y < height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x - crossSize, y);
          ctx.lineTo(x + crossSize, y);
          ctx.moveTo(x, y - crossSize);
          ctx.lineTo(x, y + crossSize);
          ctx.stroke();
        }
      }

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

      // Draw Synapses between nearby nodes
      const synapseDistance = 125;
      for (let i = 0; i < neuralNodes.length; i++) {
        const n1 = neuralNodes[i];
        for (let j = i + 1; j < neuralNodes.length; j++) {
          const n2 = neuralNodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.hypot(dx, dy);

          if (dist < synapseDistance) {
            const alpha = (1 - dist / synapseDistance) * 0.13 * Math.min(n1.z, n2.z);
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
      // Directly moves along with the scrolling across each section of the portfolio
      // ========================================================
      interface ModuleRenderData {
        m: PipelineModule;
        x: number;
        y: number;
        cx: number;
        cy: number;
        w: number;
        h: number;
        isVisible: boolean;
        isFocused: boolean;
      }

      const isMobile = width < 768;
      const leftInset = isMobile ? 16 : Math.max(32, width * 0.06);
      const rightInset = isMobile ? 16 : Math.max(32, width * 0.06);

      // Spacious scroll-progress mapped displacement:
      // Spans the full height of the portfolio so EGRESS_OUTPUT aligns cleanly alongside the "Get in Touch" card
      const docHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, 4500);
      const maxScroll = Math.max(1, docHeight - height);
      const scrollFraction = Math.min(1, Math.max(0, scrollCurrent / maxScroll));

      // At bottom / Get in Touch (scrollFraction = 1): Module 7 (EGRESS_OUTPUT, 2960) sits at height * 0.45
      // Perfectly centered alongside the "Get in Touch" card instead of crammed below it!
      const targetDisplacement = Math.max(1200, 2960 - height * 0.45);
      const scrollDisplacement = scrollFraction * targetDisplacement;

      const renderedModules: ModuleRenderData[] = modules.map((m) => {
        const yPos = m.initialY - scrollDisplacement;

        let xPos = m.align === "left"
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
      // 4. DRAW DUAL CONDUITS: FORWARD REQUEST & HIGH-VISIBILITY RESPONSE
      // Glowing streams advance and move with user scrolling!
      // ========================================================
      for (let i = 0; i < renderedModules.length - 1; i++) {
        const from = renderedModules[i];
        const to = renderedModules[i + 1];

        if (!from.isVisible && !to.isVisible) continue;

        const midY = (from.cy + to.cy) * 0.5;

        // Rail 1: Forward Request Conduit (Offset -6px)
        const reqP0x = from.cx;
        const reqP0y = from.cy - 6;
        const reqP1x = from.cx;
        const reqP1y = midY - 6;
        const reqP2x = to.cx;
        const reqP2y = midY - 6;
        const reqP3x = to.cx;
        const reqP3y = to.cy - 6;

        // Rail 2: Return Response Conduit (Offset +6px) - HIGH VISIBILITY EMERALD
        const resP0x = to.cx;
        const resP0y = to.cy + 6;
        const resP1x = to.cx;
        const resP1y = midY + 6;
        const resP2x = from.cx;
        const resP2y = midY + 6;
        const resP3x = from.cx;
        const resP3y = from.cy + 6;

        // 1. Draw Request Conduit Track (Theme Sky Blue #38bdf8)
        ctx.strokeStyle = "rgba(56, 189, 248, 0.12)";
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(reqP0x, reqP0y);
        ctx.bezierCurveTo(reqP1x, reqP1y, reqP2x, reqP2y, reqP3x, reqP3y);
        ctx.stroke();

        ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(reqP0x, reqP0y);
        ctx.bezierCurveTo(reqP1x, reqP1y, reqP2x, reqP2y, reqP3x, reqP3y);
        ctx.stroke();

        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 10]);
        // Conduit energy dash moves ONLY with scrolling! Completely still when stopped.
        ctx.lineDashOffset = -(scrollCurrent * 0.22);
        ctx.beginPath();
        ctx.moveTo(reqP0x, reqP0y);
        ctx.bezierCurveTo(reqP1x, reqP1y, reqP2x, reqP2y, reqP3x, reqP3y);
        ctx.stroke();
        ctx.setLineDash([]);

        // 2. Draw Response Conduit Track (Theme Soft Indigo #818cf8, matching theme)
        ctx.strokeStyle = "rgba(129, 140, 248, 0.12)";
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(resP0x, resP0y);
        ctx.bezierCurveTo(resP1x, resP1y, resP2x, resP2y, resP3x, resP3y);
        ctx.stroke();

        ctx.strokeStyle = "rgba(129, 140, 248, 0.45)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(resP0x, resP0y);
        ctx.bezierCurveTo(resP1x, resP1y, resP2x, resP2y, resP3x, resP3y);
        ctx.stroke();

        ctx.strokeStyle = "#818cf8";
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 10]);
        // Counter-directional response stream moves ONLY with scrolling!
        ctx.lineDashOffset = (scrollCurrent * 0.22);
        ctx.beginPath();
        ctx.moveTo(resP0x, resP0y);
        ctx.bezierCurveTo(resP1x, resP1y, resP2x, resP2y, resP3x, resP3y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Elegant terminal junction pins at endpoints and curve midpoint
        ctx.fillStyle = "rgba(56, 189, 248, 0.5)";
        ctx.beginPath();
        ctx.arc(reqP0x, reqP0y, 2, 0, Math.PI * 2);
        ctx.arc(reqP3x, reqP3y, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(129, 140, 248, 0.5)";
        ctx.beginPath();
        ctx.arc(resP0x, resP0y, 2, 0, Math.PI * 2);
        ctx.arc(resP3x, resP3y, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // ========================================================
      // 5. ANIMATE REQUEST & RESPONSE SIGNALS (MOVES ONLY WHILE SCROLLING!)
      // Stopping scrolling means the process stops dead in its tracks:
      // frozen either in the line or in the module!
      // ========================================================
      const reqLabels = [
        "REQ: INGRESS",
        "REQ: AUTH_JWT",
        "REQ: V8_EXEC",
        "REQ: SQL_QUERY",
        "REQ: BULLMQ_POP",
        "REQ: KMS_DECRYPT",
        "REQ: RAG_PROMPT",
      ];

      const resLabels = [
        "RES: 200 OK",
        "RES: TOKEN_VALID",
        "RES: COMPUTE_200",
        "RES: CDC_ROW",
        "RES: CACHE_SYNC",
        "RES: CIPHER_OK",
        "RES: RAG_STREAM",
      ];

      // Motion step: proportional ONLY to user scroll!
      // If user stops scrolling (Math.abs(smoothDelta) <= 0.005), step is 0 -> process STOPS!
      const scrollStep = Math.abs(smoothDelta) > 0.005 ? smoothDelta * 0.0016 : 0;

      if (scrollStep !== 0) {
        signals.forEach((sig) => {
          if (sig.direction === 1) {
            // Forward request moves forward on scroll down, backward on scroll up
            sig.progress += scrollStep;

            if (sig.progress >= 1) {
              sig.progress -= 1;
              sig.stageIndex++;

              if (sig.stageIndex >= renderedModules.length - 1) {
                sig.direction = -1;
                sig.stageIndex = renderedModules.length - 2;
                sig.color = "#818cf8";
                sig.label = resLabels[sig.stageIndex];
              } else {
                sig.color = "#38bdf8";
                sig.label = reqLabels[sig.stageIndex];
              }

              const dest = renderedModules[sig.stageIndex];
              if (dest) {
                dest.m.activeGlow = 0.85;
                dest.m.statusText = "PROCESSING...";
              }
            } else if (sig.progress < 0) {
              sig.progress += 1;
              sig.stageIndex--;

              if (sig.stageIndex < 0) {
                sig.stageIndex = 0;
                sig.progress = 0;
              } else {
                sig.label = reqLabels[sig.stageIndex];
              }
            }
          } else {
            // Return response moves forward on scroll down, backward on scroll up
            sig.progress += scrollStep;

            if (sig.progress >= 1) {
              sig.progress -= 1;
              sig.stageIndex--;

              if (sig.stageIndex < 0) {
                sig.direction = 1;
                sig.stageIndex = 0;
                sig.color = "#38bdf8";
                sig.label = reqLabels[0];
              } else {
                sig.color = "#818cf8";
                sig.label = resLabels[sig.stageIndex];
              }

              const dest = renderedModules[sig.stageIndex];
              if (dest) {
                dest.m.activeGlow = 0.85;
                dest.m.statusText = sig.stageIndex === 0 ? "DISPATCHED 200 OK" : "RELAYING 200...";
              }
            } else if (sig.progress < 0) {
              sig.progress += 1;
              sig.stageIndex++;

              if (sig.stageIndex >= renderedModules.length - 1) {
                sig.stageIndex = renderedModules.length - 2;
                sig.progress = 1;
              } else {
                sig.label = resLabels[sig.stageIndex];
              }
            }
          }
        });
      }

      // Draw all signal packets at their current positions (motionless when stopped)
      signals.forEach((sig) => {
        const from = renderedModules[sig.stageIndex];
        const to = renderedModules[sig.stageIndex + 1];
        if (!from || !to) return;

        const midY = (from.cy + to.cy) * 0.5;

        // Calculate Head and Tail points along the respective rail
        let p0x: number, p0y: number, p1x: number, p1y: number, p2x: number, p2y: number, p3x: number, p3y: number;

        if (sig.direction === 1) {
          // Forward rail (top to bottom, offset -6)
          p0x = from.cx; p0y = from.cy - 6;
          p1x = from.cx; p1y = midY - 6;
          p2x = to.cx;   p2y = midY - 6;
          p3x = to.cx;   p3y = to.cy - 6;
        } else {
          // Return rail (bottom to top, offset +6)
          p0x = to.cx;   p0y = to.cy + 6;
          p1x = to.cx;   p1y = midY + 6;
          p2x = from.cx; p2y = midY + 6;
          p3x = from.cx; p3y = from.cy + 6;
        }

        const isOutput = sig.direction === -1;

        const ptHead = getCubicBezierPoint(p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, sig.progress);
        const ptTail1 = getCubicBezierPoint(p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, sig.progress - 0.035);
        const ptTail2 = getCubicBezierPoint(p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, sig.progress - 0.07);

        if (ptHead.y > -20 && ptHead.y < height + 20) {
          // Trailing Comet Tail 2 (Theme Cyan & Soft Indigo)
          ctx.fillStyle = isOutput ? "rgba(129, 140, 248, 0.2)" : "rgba(56, 189, 248, 0.18)";
          ctx.beginPath();
          ctx.arc(ptTail2.x, ptTail2.y, 2.2, 0, Math.PI * 2);
          ctx.fill();

          // Trailing Comet Tail 1
          ctx.fillStyle = isOutput ? "rgba(165, 180, 252, 0.45)" : "rgba(125, 211, 252, 0.45)";
          ctx.beginPath();
          ctx.arc(ptTail1.x, ptTail1.y, 3.2, 0, Math.PI * 2);
          ctx.fill();

          // Outer luminous glow
          ctx.fillStyle = isOutput
            ? "rgba(129, 140, 248, 0.38)"
            : "rgba(56, 189, 248, 0.35)";
          ctx.beginPath();
          ctx.arc(ptHead.x, ptHead.y, 8, 0, Math.PI * 2);
          ctx.fill();

          // Signal Core (Vivid photon core)
          ctx.fillStyle = isOutput ? "#c7d2fe" : "#ffffff";
          ctx.beginPath();
          ctx.arc(ptHead.x, ptHead.y, 3.8, 0, Math.PI * 2);
          ctx.fill();

          // Signal Process Label Badge (Matches clean theme card aesthetic)
          const labelText = sig.label;
          ctx.font = "600 8.5px 'DM Mono', monospace";
          const textW = ctx.measureText(labelText).width;
          const chipX = ptHead.x + 10;
          const chipY = ptHead.y - 7;

          // Theme glass chip background
          ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
          ctx.strokeStyle = isOutput ? "rgba(129, 140, 248, 0.35)" : "rgba(56, 189, 248, 0.35)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.rect(chipX - 4, chipY, textW + 8, 14);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = isOutput ? "#c7d2fe" : "#bae6fd";
          ctx.fillText(labelText, chipX, ptHead.y + 3);
        }
      });

      // ========================================================
      // 6. DRAW ALL MODULE CARDS (INCLUDING LANGGRAPH_RAG & EGRESS)
      // ========================================================
      renderedModules.forEach((rm) => {
        if (!rm.isVisible) return;

        const { m, x, y, w, h } = rm;
        const isProcessing = m.activeGlow > 0;
        const glowRatio = m.activeGlow / 0.85;
        const isLangGraph = m.id === 6;
        const isEndModule = m.id === 7;

        // Module Glass Card background
        ctx.fillStyle = isProcessing
          ? `rgba(16, 32, 50, ${0.75 + glowRatio * 0.22})`
          : "rgba(11, 16, 26, 0.72)";

        // Card border with dynamic pulse and stage-specific color identity
        ctx.strokeStyle = isProcessing
          ? `rgba(56, 189, 248, ${0.5 + glowRatio * 0.5})`
          : isLangGraph
          ? "rgba(168, 85, 247, 0.45)" // Purple glow for LangGraph RAG
          : isEndModule
          ? "rgba(129, 140, 248, 0.45)" // Indigo for egress output terminal
          : "rgba(56, 189, 248, 0.22)";
        ctx.lineWidth = isProcessing || isLangGraph || isEndModule ? 1.6 : 1;

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

        // Corner engineering brackets
        ctx.strokeStyle = isProcessing
          ? "#38bdf8"
          : isLangGraph
          ? "#a855f7"
          : isEndModule
          ? "#818cf8"
          : m.accentColor;
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

        // Status LED
        const ledColor = isProcessing
          ? "#38bdf8"
          : isLangGraph
          ? "#c084fc"
          : isEndModule
          ? "#a5b4fc"
          : m.accentColor;
        ctx.fillStyle = ledColor;
        ctx.beginPath();
        ctx.arc(x + 12, y + 15, isProcessing ? 3.5 : 2.5, 0, Math.PI * 2);
        ctx.fill();

        if (isProcessing) {
          ctx.strokeStyle = `rgba(56, 189, 248, ${glowRatio * 0.7})`;
          ctx.beginPath();
          ctx.arc(x + 12, y + 15, 7.5, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Status text / Protocol
        ctx.font = "600 9px 'DM Mono', monospace";
        ctx.fillStyle = isProcessing
          ? "#38bdf8"
          : isLangGraph
          ? "#c084fc"
          : isEndModule
          ? "#818cf8"
          : "rgba(148, 163, 184, 0.8)";
        ctx.fillText(m.statusText, x + 22, y + 18);

        // Module Name
        ctx.font = "600 11px 'DM Mono', monospace";
        ctx.fillStyle = isProcessing
          ? "#ffffff"
          : isLangGraph
          ? "#f5f3ff"
          : isEndModule
          ? "#e0e7ff"
          : "#f8fafc";
        ctx.fillText(m.tag, x + 12, y + 39);

        // Subtitle / Code token
        ctx.font = "500 10px 'DM Mono', monospace";
        ctx.fillStyle = isLangGraph ? "#c084fc" : isEndModule ? "#818cf8" : m.accentColor;
        ctx.fillText(m.sub, x + 12, y + 57);
      });
    }

    function onVisibilityChange() {
      isVisible = !document.hidden;
      if (isVisible && !animationId) {
        lastTime = performance.now();
        animationId = requestAnimationFrame(render);
      } else if (!isVisible && animationId) {
        cancelAnimationFrame(animationId);
        animationId = 0;
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="network-bg-canvas"
      aria-hidden="true"
    />
  );
};

export default NetworkBackground;
