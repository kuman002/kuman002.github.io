import React, { useEffect, useRef, useState } from "react";

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
// Architecture Pipeline Module & Telemetry Definition
// ----------------------------------------------------
export interface TelemetryData {
  id: number;
  stageNumber: string;
  tag: string;
  sub: string;
  protocol: string;
  accentColor: string;
  ioSample: {
    input: string;
    process: string;
    output: string;
  };
  metrics: {
    latency: string;
    throughput: string;
    security: string;
  };
}

interface PipelineModule {
  id: number;
  align: "left" | "right";
  initialY: number;
  width: number;
  height: number;
  stageNumber: string;
  tag: string;
  sub: string;
  protocol: string;
  accentColor: string;
  activeGlow: number; // Duration countdown for processing flash
  statusText: string;
  hoverAlpha: number; // Smooth fade-in for inspection hover box
  ioSample: {
    input: string;
    process: string;
    output: string;
  };
  metrics: {
    latency: string;
    throughput: string;
    security: string;
  };
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
    stageNumber: "01 / 08",
    tag: "API_GATEWAY",
    sub: "EDGE // HTTP/3",
    protocol: "INGRESS",
    accentColor: "#38bdf8",
    ioSample: {
      input: "POST /api/v1/orders { userId, items, authNonce }",
      process: "TLS 1.3 audit · Rate-limiting (100 req/min) · Schema parse",
      output: "Sanitized request envelope -> Route to Cognito Auth (200 OK)",
    },
    metrics: {
      latency: "0.6ms",
      throughput: "35k req/s",
      security: "AWS WAF · DDoS Shield",
    },
  },
  {
    id: 1,
    align: "right" as const,
    initialY: 540,
    width: 155,
    height: 74,
    stageNumber: "02 / 08",
    tag: "AUTH_COGNITO",
    sub: "OIDC // JWT_RBAC",
    protocol: "SECURITY",
    accentColor: "#818cf8",
    ioSample: {
      input: "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9... (JWT)",
      process: "JWKS RSA-256 signature verify · Token expiry & RBAC check",
      output: "ClaimsPrincipal { uid: 'usr_742', role: 'admin', scope: ['write'] }",
    },
    metrics: {
      latency: "1.1ms",
      throughput: "22k auth/s",
      security: "OAuth 2.0 · PKCE Flow",
    },
  },
  {
    id: 2,
    align: "left" as const,
    initialY: 920,
    width: 155,
    height: 74,
    stageNumber: "03 / 08",
    tag: "LAMBDA_HANDLER",
    sub: "NODE.JS 22 // ARM64",
    protocol: "COMPUTE",
    accentColor: "#38bdf8",
    ioSample: {
      input: "APIGatewayProxyEvent { body, headers, claimsPrincipal }",
      process: "Domain business logic · Input sanitization · Entity validation",
      output: "Validated domain payload -> Cache check & DB transaction",
    },
    metrics: {
      latency: "3.8ms",
      throughput: "12k exec/s",
      security: "Zero-Vulnerability MicroVM",
    },
  },
  {
    id: 3,
    align: "right" as const,
    initialY: 1300,
    width: 155,
    height: 74,
    stageNumber: "04 / 08",
    tag: "REDIS_CACHE",
    sub: "IN-MEMORY // CLUSTER",
    protocol: "CACHE_LOCK",
    accentColor: "#f43f5e",
    ioSample: {
      input: "GET user:session:usr_742 & SETNX order:lock:ord_581",
      process: "Atomic in-memory lookup · Sub-millisecond hit · Distributed lock",
      output: "CacheHit { TTL: 3600s, lockAcquired: true } -> DB dispatch",
    },
    metrics: {
      latency: "0.3ms",
      throughput: "60k ops/s",
      security: "TLS Encryption In-Transit",
    },
  },
  {
    id: 4,
    align: "left" as const,
    initialY: 1680,
    width: 155,
    height: 74,
    stageNumber: "05 / 08",
    tag: "POSTGRES_RDS",
    sub: "ACID // READ_REPLICA",
    protocol: "DATABASE",
    accentColor: "#38bdf8",
    ioSample: {
      input: "BEGIN; INSERT INTO orders VALUES (...) RETURNING id; COMMIT;",
      process: "Connection pooler dispatch · Query planner exec · WAL commit",
      output: "OrderEntity { id: 'ord_581', status: 'CONFIRMED', total: $120.00 }",
    },
    metrics: {
      latency: "4.5ms",
      throughput: "6.5k qps",
      security: "Multi-AZ · VPC Peering",
    },
  },
  {
    id: 5,
    align: "right" as const,
    initialY: 2060,
    width: 155,
    height: 74,
    stageNumber: "06 / 08",
    tag: "SQS_EVENT_QUEUE",
    sub: "FIFO // ASYNC_BUS",
    protocol: "QUEUE_EVENT",
    accentColor: "#f59e0b",
    ioSample: {
      input: "EventPayload { type: 'ORDER_CREATED', orderId: 'ord_581' }",
      process: "At-least-once FIFO queueing · De-duplication · DLQ retry policy",
      output: "MessageId: msg_41029 -> Dispatched to background notification worker",
    },
    metrics: {
      latency: "0.9ms",
      throughput: "18k msg/s",
      security: "SSE-KMS Encryption At-Rest",
    },
  },
  {
    id: 6,
    align: "left" as const,
    initialY: 2440,
    width: 160,
    height: 74,
    stageNumber: "07 / 08",
    tag: "S3_KMS_VAULT",
    sub: "AES-256 // ENCRYPTED",
    protocol: "STORAGE_KMS",
    accentColor: "#a855f7",
    ioSample: {
      input: "Generated invoice receipt PDF + Audit log metadata blob",
      process: "Envelope encryption via AWS KMS HSM (AES-256-GCM) · Multi-part PUT",
      output: "Encrypted bucket object: s3://receipts-vault/2026/ord_581.pdf",
    },
    metrics: {
      latency: "8.2ms",
      throughput: "3.5k put/s",
      security: "FIPS 140-2 L3 · IAM Roles",
    },
  },
  {
    id: 7,
    align: "right" as const,
    initialY: 2820,
    width: 160,
    height: 74,
    stageNumber: "08 / 08",
    tag: "EGRESS_RESPONSE",
    sub: "HTTP/2 200 // JSON",
    protocol: "CLIENT_RESP",
    accentColor: "#818cf8",
    ioSample: {
      input: "Finalized response { code: 200, order: 'ord_581', status: 'SUCCESS' }",
      process: "Brotli compression · Response serialization · CloudWatch metrics emit",
      output: "HTTP/2 200 OK (Round-trip completed, total latency: 28ms)",
    },
    metrics: {
      latency: "0.7ms",
      throughput: "28k res/s",
      security: "Strict-Transport-Security",
    },
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
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [activeTelemetry, setActiveTelemetry] = useState<TelemetryData | null>(null);

  const activeTelemetryRef = useRef<TelemetryData | null>(null);
  const isOverOverlayRef = useRef<boolean>(false);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    }

    function handleMouseLeave() {
      mouse.x = -1000;
      mouse.y = -1000;
      mouse.targetX = 0;
      mouse.targetY = 0;
    }

    function handleTouch(e: TouchEvent) {
      if (e.touches && e.touches.length > 0) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
      }
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave, { passive: true });
    window.addEventListener("touchstart", handleTouch, { passive: true });

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
    }

    resize();
    window.addEventListener("resize", resize);

    // Instantiate architecture modules state
    const modules: PipelineModule[] = PIPELINE_CONFIG.map((m) => ({
      ...m,
      activeGlow: 0,
      statusText: m.protocol,
      hoverAlpha: 0,
    }));

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

      // At bottom / Get in Touch (scrollFraction = 1): Module 7 (EGRESS_OUTPUT, 2820) sits at height * 0.45
      // Perfectly centered alongside the "Get in Touch" card instead of crammed below it!
      const targetDisplacement = Math.max(1200, 2820 - height * 0.45);
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

        // Rail 1: Forward Request Conduit (Offset -3.5px)
        const reqP0x = from.cx;
        const reqP0y = from.cy - 3.5;
        const reqP1x = from.cx;
        const reqP1y = midY - 3.5;
        const reqP2x = to.cx;
        const reqP2y = midY - 3.5;
        const reqP3x = to.cx;
        const reqP3y = to.cy - 3.5;

        // Rail 2: Return Response Conduit (Offset +3.5px)
        const resP0x = to.cx;
        const resP0y = to.cy + 3.5;
        const resP1x = to.cx;
        const resP1y = midY + 3.5;
        const resP2x = from.cx;
        const resP2y = midY + 3.5;
        const resP3x = from.cx;
        const resP3y = from.cy + 3.5;

        // 1. Draw Request Conduit Track (Theme Sky Blue #38bdf8 - sleek hairline)
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

        // 2. Draw Response Conduit Track (Theme Soft Indigo #818cf8 - sleek hairline)
        ctx.strokeStyle = "rgba(129, 140, 248, 0.12)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(resP0x, resP0y);
        ctx.bezierCurveTo(resP1x, resP1y, resP2x, resP2y, resP3x, resP3y);
        ctx.stroke();

        ctx.strokeStyle = "rgba(129, 140, 248, 0.45)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 24]);
        ctx.lineDashOffset = (scrollCurrent * 0.2);
        ctx.beginPath();
        ctx.moveTo(resP0x, resP0y);
        ctx.bezierCurveTo(resP1x, resP1y, resP2x, resP2y, resP3x, resP3y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Delicate terminal junction pins
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
      // 5. ANIMATE REQUEST & RESPONSE SIGNALS (TIED TO USER SCROLL)
      // The request directly follows user scroll and stays visible in the viewport
      // all the way from API_GATEWAY at top to EGRESS_OUTPUT at the end!
      // ========================================================
      const reqLabels = [
        "REQ: INGRESS // TLS 1.3",
        "REQ: AUTH_VERIFY // JWT",
        "REQ: LAMBDA_EXEC // V8",
        "REQ: CACHE_LOOKUP // REDIS",
        "REQ: SQL_TX // POSTGRES",
        "REQ: ASYNC_DISPATCH // SQS",
        "REQ: KMS_ENCRYPT // S3",
      ];

      const resLabels = [
        "RES: 200 OK // SUCCESS",
        "RES: TOKEN_VALID // CLAIMS",
        "RES: COMPUTE_200 // NORMALIZED",
        "RES: CACHE_HIT // LOCK_OK",
        "RES: DB_COMMITTED // ACID",
        "RES: SQS_ACK // ENQUEUED",
        "RES: S3_OBJECT_SAVED",
      ];

      const totalStages = renderedModules.length - 1; // 7 stages across 8 modules
      // Map scroll progress (0.0 to 1.0) directly across the 7 stages (0 to 6.999)
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

      // Safe, modular signal packet drawer
      function drawSignalPacket(
        stageIdx: number,
        direction: 1 | -1,
        progress: number,
        label: string
      ) {
        if (stageIdx < 0 || stageIdx >= totalStages) return;
        const from = renderedModules[stageIdx];
        const to = renderedModules[stageIdx + 1];
        if (!from || !to) return;

        const midY = (from.cy + to.cy) * 0.5;
        let p0x: number, p0y: number, p1x: number, p1y: number, p2x: number, p2y: number, p3x: number, p3y: number;

        if (direction === 1) {
          // Forward Request rail (offset -3.5px)
          p0x = from.cx; p0y = from.cy - 3.5;
          p1x = from.cx; p1y = midY - 3.5;
          p2x = to.cx;   p2y = midY - 3.5;
          p3x = to.cx;   p3y = to.cy - 3.5;
        } else {
          // Return Response rail (offset +3.5px)
          p0x = to.cx;   p0y = to.cy + 3.5;
          p1x = to.cx;   p1y = midY + 3.5;
          p2x = from.cx; p2y = midY + 3.5;
          p3x = from.cx; p3y = from.cy + 3.5;
        }

        const isOutput = direction === -1;
        const ptHead = getCubicBezierPoint(p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, progress);
        const ptTail1 = getCubicBezierPoint(p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, Math.max(0, progress - 0.035));
        const ptTail2 = getCubicBezierPoint(p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y, Math.max(0, progress - 0.07));

        if (ptHead.y > -25 && ptHead.y < height + 25) {
          // Comet Tail 2
          ctx.fillStyle = isOutput ? "rgba(129, 140, 248, 0.16)" : "rgba(56, 189, 248, 0.15)";
          ctx.beginPath();
          ctx.arc(ptTail2.x, ptTail2.y, 1.4, 0, Math.PI * 2);
          ctx.fill();

          // Comet Tail 1
          ctx.fillStyle = isOutput ? "rgba(165, 180, 252, 0.35)" : "rgba(125, 211, 252, 0.38)";
          ctx.beginPath();
          ctx.arc(ptTail1.x, ptTail1.y, 2.2, 0, Math.PI * 2);
          ctx.fill();

          // Glow halo
          ctx.fillStyle = isOutput ? "rgba(129, 140, 248, 0.3)" : "rgba(56, 189, 248, 0.32)";
          ctx.beginPath();
          ctx.arc(ptHead.x, ptHead.y, 6.0, 0, Math.PI * 2);
          ctx.fill();

          // Photon core
          ctx.fillStyle = isOutput ? "#c7d2fe" : "#ffffff";
          ctx.beginPath();
          ctx.arc(ptHead.x, ptHead.y, 2.6, 0, Math.PI * 2);
          ctx.fill();

          // Telemetry chip
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

      // 1. PRIMARY SCROLL-TRACKING REQUEST PACKET:
      // Glides continuously with user scroll through each conduit stage from API_GATEWAY down to EGRESS_OUTPUT!
      const reqStage = Math.min(totalStages - 1, Math.floor(globalProgress));
      const reqProg = globalProgress - reqStage;
      drawSignalPacket(reqStage, 1, reqProg, reqLabels[reqStage] || "REQ: INGRESS");

      // 2. PRIMARY SCROLL-TRACKING RESPONSE PACKET:
      // Glides along the return response rail
      const resStage = (reqStage + 4) % totalStages;
      const resProg = 1 - reqProg;
      drawSignalPacket(resStage, -1, resProg, resLabels[resStage] || "RES: 200 OK");

      // 3. PIPELINE CONTINUOUS FLOW PACKETS (REQUESTS & RESPONSES):
      // Ensures visible activity on conduits throughout the architecture
      const secReqStage = (reqStage + 2) % totalStages;
      const secReqProg = (reqProg + 0.5) % 1;
      drawSignalPacket(secReqStage, 1, secReqProg, reqLabels[secReqStage] || "REQ: PIPELINE");

      const secResStage = (reqStage + 1) % totalStages;
      const secResProg = (1 - reqProg + 0.5) % 1;
      drawSignalPacket(secResStage, -1, secResProg, resLabels[secResStage] || "RES: PIPELINE");

      // ========================================================
      // 6. DRAW ALL SERVERLESS ARCHITECTURE MODULE CARDS
      // ========================================================
      renderedModules.forEach((rm) => {
        if (!rm.isVisible) return;

        const { m, x, y, w, h } = rm;
        const isHovered = activeTelemetryRef.current?.id === m.id;
        const isProcessing = m.activeGlow > 0;
        const glowRatio = m.activeGlow / 0.85;

        // Module Glass Card background
        ctx.fillStyle = isHovered
          ? `rgba(16, 28, 52, 0.96)`
          : isProcessing
          ? `rgba(16, 32, 54, ${0.88 + glowRatio * 0.12})`
          : "rgba(10, 16, 26, 0.90)";

        // Card border with dynamic pulse and stage-specific color identity
        ctx.strokeStyle = isHovered
          ? m.accentColor
          : isProcessing
          ? `rgba(56, 189, 248, ${0.7 + glowRatio * 0.3})`
          : `${m.accentColor}77`; // Soft translucent stage accent
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

        // Corner engineering brackets
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

        // Status LED
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

        // Status text / Protocol
        ctx.font = "600 9px 'DM Mono', monospace";
        ctx.fillStyle = isHovered
          ? m.accentColor
          : isProcessing
          ? "#38bdf8"
          : "rgba(148, 163, 184, 0.85)";
        ctx.fillText(m.statusText, x + 22, y + 18);

        // Module Name
        ctx.font = "600 11px 'DM Mono', monospace";
        ctx.fillStyle = isHovered || isProcessing ? "#ffffff" : "#f1f5f9";
        ctx.fillText(m.tag, x + 12, y + 39);

        // Subtitle / Code token
        ctx.font = "500 10px 'DM Mono', monospace";
        ctx.fillStyle = m.accentColor;
        ctx.fillText(m.sub, x + 12, y + 57);
      });

      // ========================================================
      // 7. MODULE HOVER INSPECTION & 60FPS TELEMETRY HUD SYNC
      // Viewport-aware collision handling & floating DOM HUD at z-index 9999
      // ========================================================
      let hoveredRm: (typeof renderedModules)[0] | null = null;
      if (mouse.x > 0 && mouse.y > 0) {
        for (let i = 0; i < renderedModules.length; i++) {
          const rm = renderedModules[i];
          if (!rm.isVisible) continue;
          // Generous hit box for effortless hover targeting
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

      // Handle hover telemetry state transition
      if (hoveredRm) {
        if (dismissTimeoutRef.current) {
          clearTimeout(dismissTimeoutRef.current);
          dismissTimeoutRef.current = null;
        }

        const tData: TelemetryData = {
          id: hoveredRm.m.id,
          stageNumber: hoveredRm.m.stageNumber,
          tag: hoveredRm.m.tag,
          sub: hoveredRm.m.sub,
          protocol: hoveredRm.m.protocol,
          accentColor: hoveredRm.m.accentColor,
          ioSample: hoveredRm.m.ioSample,
          metrics: hoveredRm.m.metrics,
        };

        if (activeTelemetryRef.current?.id !== hoveredRm.m.id) {
          activeTelemetryRef.current = tData;
          setActiveTelemetry(tData);
        }
      } else if (!isOverOverlayRef.current && activeTelemetryRef.current) {
        // If neither module nor overlay is hovered, dismiss with smooth grace window
        if (!dismissTimeoutRef.current) {
          dismissTimeoutRef.current = setTimeout(() => {
            activeTelemetryRef.current = null;
            setActiveTelemetry(null);
            dismissTimeoutRef.current = null;
          }, 200);
        }
      }

      // Real-time 60fps positioning of the HUD overlay while active
      if (activeTelemetryRef.current) {
        const activeId = activeTelemetryRef.current.id;
        const activeMod = renderedModules.find((rm) => rm.m.id === activeId);

        if (activeMod && activeMod.isVisible) {
          const boxWidth = Math.min(340, width - 24);
          const boxHeight = 160;

          let targetX: number;
          let targetY: number;

          if (width < 768) {
            // Mobile / Small Screen: Center horizontally, place below or above module
            targetX = Math.max(12, (width - boxWidth) * 0.5);
            if (activeMod.y + activeMod.h + boxHeight + 16 < height) {
              targetY = activeMod.y + activeMod.h + 12;
            } else {
              targetY = Math.max(12, activeMod.y - boxHeight - 12);
            }
          } else {
            // Desktop: Align adjacent to module with smart edge collision handling
            if (activeMod.m.align === "left") {
              targetX = activeMod.x + activeMod.w + 16;
              // If placing on the right would exceed screen boundary
              if (targetX + boxWidth > width - 12) {
                targetX = Math.max(12, width - boxWidth - 12);
              }
            } else {
              targetX = activeMod.x - boxWidth - 16;
              // If placing on the left would exceed screen boundary
              if (targetX < 12) {
                targetX = 12;
              }
            }
            targetY = activeMod.y + activeMod.h * 0.5 - boxHeight * 0.5;
          }

          // Strict viewport clamping: never clipped on any edge
          targetX = Math.max(12, Math.min(width - boxWidth - 12, targetX));
          targetY = Math.max(12, Math.min(height - boxHeight - 12, targetY));

          if (overlayRef.current) {
            overlayRef.current.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
          }

          // Draw high-tech animated canvas connecting beam from module to overlay anchor
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

          // Subtle pulse reticle on the hovered module anchor
          ctx.fillStyle = activeTelemetryRef.current.accentColor;
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
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
      }
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("touchstart", handleTouch);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="network-bg-canvas"
        aria-hidden="true"
      />
      {activeTelemetry && (
        <div
          ref={overlayRef}
          className={`telemetry-inspection-overlay ${activeTelemetry ? "is-active" : ""}`}
          style={{
            "--hud-accent": activeTelemetry.accentColor,
          } as React.CSSProperties}
          onMouseEnter={() => {
            isOverOverlayRef.current = true;
            if (dismissTimeoutRef.current) {
              clearTimeout(dismissTimeoutRef.current);
              dismissTimeoutRef.current = null;
            }
          }}
          onMouseLeave={() => {
            isOverOverlayRef.current = false;
          }}
        >
          <div className="telemetry-header">
            <div className="telemetry-header-left">
              <span
                className="telemetry-led"
                style={{
                  background: activeTelemetry.accentColor,
                  boxShadow: `0 0 10px ${activeTelemetry.accentColor}`,
                }}
              />
              <span className="telemetry-stage-pill">{activeTelemetry.stageNumber}</span>
              <span className="telemetry-title">{activeTelemetry.tag}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span className="telemetry-protocol-badge">{activeTelemetry.protocol}</span>
              <button
                type="button"
                className="telemetry-close-btn"
                onClick={() => {
                  activeTelemetryRef.current = null;
                  setActiveTelemetry(null);
                }}
                aria-label="Close telemetry overlay"
              >
                ×
              </button>
            </div>
          </div>

          <div className="telemetry-body">
            <div className="telemetry-row">
              <span className="telemetry-badge input-badge">INPUT</span>
              <code className="telemetry-code">{activeTelemetry.ioSample.input}</code>
            </div>
            <div className="telemetry-row">
              <span className="telemetry-badge proc-badge">PROC</span>
              <code className="telemetry-code">{activeTelemetry.ioSample.process}</code>
            </div>
            <div className="telemetry-row">
              <span className="telemetry-badge output-badge">OUTPUT</span>
              <code className="telemetry-code">{activeTelemetry.ioSample.output}</code>
            </div>
          </div>

          <div className="telemetry-footer">
            <span className="telemetry-metric">
              <strong>LATENCY:</strong> {activeTelemetry.metrics.latency}
            </span>
            <span className="telemetry-metric">
              <strong>RATE:</strong> {activeTelemetry.metrics.throughput}
            </span>
            <span className="telemetry-metric">
              <strong>SEC:</strong> {activeTelemetry.metrics.security}
            </span>
          </div>
        </div>
      )}
    </>
  );
};

export default NetworkBackground;
