import * as THREE from "three";
import { gsap } from "gsap";

export function init3DScene() {
  const emptyScene = {
    updateScroll: (_scroll: number) => {},
    setTab: (_tab: number) => {},
    triggerBurst: () => {},
    destroy: () => {},
  };

  const canvas = document.querySelector<HTMLCanvasElement>("#webgl-canvas");
  if (!canvas) return emptyScene;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return emptyScene;

  // 1. Scene, Camera, Renderer
  const scene = new THREE.Scene();

  let width = window.innerWidth;
  let height = window.innerHeight;

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(-3.4, 3.8, 5.6);
  camera.lookAt(-4.0, 0.1, 1.8);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(width, height);
  const getPixelRatio = () => Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.25 : 1.5);
  renderer.setPixelRatio(getPixelRatio());
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  // 2. Hardware Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
  scene.add(ambientLight);

  const topKeyLight = new THREE.DirectionalLight(0xffffff, 3.2);
  topKeyLight.position.set(4, 14, 6);
  scene.add(topKeyLight);

  const sideFillLight = new THREE.DirectionalLight(0x189bf2, 2.0);
  sideFillLight.position.set(-6, 8, -4);
  scene.add(sideFillLight);

  const goldRimLight = new THREE.DirectionalLight(0xffb830, 1.2);
  goldRimLight.position.set(6, -2, -6);
  scene.add(goldRimLight);

  // 3. DEEP BACKGROUND CYBER HORIZON & AMBIENT AURA LIGHT
  // A. Dynamic Volumetric Aura Glow in Deep Space (Changes color with active service)
  const auraCanvas = document.createElement("canvas");
  auraCanvas.width = 256;
  auraCanvas.height = 256;
  const aCtx = auraCanvas.getContext("2d");
  if (aCtx) {
    const grad = aCtx.createRadialGradient(128, 128, 10, 128, 128, 120);
    grad.addColorStop(0, "rgba(255, 255, 255, 1)");
    grad.addColorStop(0.35, "rgba(255, 255, 255, 0.5)");
    grad.addColorStop(0.7, "rgba(255, 255, 255, 0.15)");
    grad.addColorStop(1, "rgba(255, 255, 255, 0)");
    aCtx.fillStyle = grad;
    aCtx.fillRect(0, 0, 256, 256);
  }
  const auraTexture = new THREE.CanvasTexture(auraCanvas);
  const auraMat = new THREE.SpriteMaterial({
    map: auraTexture,
    color: 0xff2a6d, // Starts with Gateway Rose Magenta
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const auraSprite = new THREE.Sprite(auraMat);
  auraSprite.position.set(0, 1.2, -6.5);
  auraSprite.scale.set(16, 16, 1);
  scene.add(auraSprite);

  // B. Infinite Perspective Cyber Horizon Floor Grid (Below and behind motherboard)
  const cyberFloorGroup = new THREE.Group();
  cyberFloorGroup.position.set(0, -2.2, -3.5);
  cyberFloorGroup.rotation.x = -Math.PI * 0.32;
  scene.add(cyberFloorGroup);

  const floorGridSize = 32;
  const floorGridLines = 32;
  const floorLineMat = new THREE.LineBasicMaterial({
    color: 0x143c58,
    transparent: true,
    opacity: 0.32,
  });

  // Longitudinal perspective lines
  const longPts: THREE.Vector3[] = [];
  for (let i = 0; i <= floorGridLines; i++) {
    const x = (i / floorGridLines - 0.5) * floorGridSize;
    longPts.push(new THREE.Vector3(x, 0, -floorGridSize * 0.5));
    longPts.push(new THREE.Vector3(x, 0, floorGridSize * 0.5));
  }
  const longGeo = new THREE.BufferGeometry().setFromPoints(longPts);
  cyberFloorGroup.add(new THREE.LineSegments(longGeo, floorLineMat));

  // Dynamic transverse scrolling cross-lines
  const transLinesCount = 18;
  const transLineSpacing = floorGridSize / transLinesCount;
  const transLineSegments: THREE.Line[] = [];
  const transMat = new THREE.LineBasicMaterial({
    color: 0x226284,
    transparent: true,
    opacity: 0.45,
  });

  for (let j = 0; j < transLinesCount; j++) {
    const pts = [
      new THREE.Vector3(-floorGridSize * 0.5, 0, 0),
      new THREE.Vector3(floorGridSize * 0.5, 0, 0),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geo, transMat);
    cyberFloorGroup.add(line);
    transLineSegments.push(line);
  }

  // 4. MASTER 3D MOTHERBOARD ASSEMBLY
  const boardGroup = new THREE.Group();
  boardGroup.rotation.x = -Math.PI * 0.28; // ~50 degrees perspective tilt
  scene.add(boardGroup);

  // A. Physical 3D FR-4 Substrate Slab with Thickness & Edge Copper
  const pcbW = 15.2;
  const pcbH = 0.28;
  const pcbD = 12.0;

  const slabGeo = new THREE.BoxGeometry(pcbW, pcbH, pcbD);
  const slabMat = new THREE.MeshStandardMaterial({
    color: 0x040810,
    roughness: 0.8,
    metalness: 0.35,
  });
  const slabMesh = new THREE.Mesh(slabGeo, slabMat);
  slabMesh.position.y = -pcbH * 0.5;
  boardGroup.add(slabMesh);

  // Perimeter Gold Ground Rail
  const edgeRailGeo = new THREE.BoxGeometry(pcbW + 0.08, 0.03, pcbD + 0.08);
  const edgeRailMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.9,
    roughness: 0.2,
  });
  const edgeRail = new THREE.Mesh(edgeRailGeo, edgeRailMat);
  edgeRail.position.y = 0.005;
  boardGroup.add(edgeRail);

  // Perimeter Chaser Photon Light along Edge Rail
  const chaserGeo = new THREE.SphereGeometry(0.08, 8, 8);
  const chaserMat = new THREE.MeshBasicMaterial({ color: 0x38e1f0 });
  const chaserMesh = new THREE.Mesh(chaserGeo, chaserMat);
  boardGroup.add(chaserMesh);

  // Dual-tone Copper Grid Lines overlay
  const gridHelper = new THREE.GridHelper(14, 28, 0x1f4664, 0x0c1e2e);
  gridHelper.position.y = 0.01;
  boardGroup.add(gridHelper);

  // 4 Corner Brass Mounting Standoffs with Chrome Screw Heads
  const standoffPositions = [
    { x: -pcbW * 0.46, z: -pcbD * 0.45 },
    { x: pcbW * 0.46, z: -pcbD * 0.45 },
    { x: -pcbW * 0.46, z: pcbD * 0.45 },
    { x: pcbW * 0.46, z: pcbD * 0.45 },
  ];

  const standoffGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.3, 16);
  const standoffMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.95,
    roughness: 0.15,
  });
  const screwTopGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.06, 16);
  const screwTopMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    metalness: 0.9,
    roughness: 0.25,
  });

  standoffPositions.forEach((pos) => {
    const stand = new THREE.Mesh(standoffGeo, standoffMat);
    stand.position.set(pos.x, 0.05, pos.z);
    boardGroup.add(stand);

    const screw = new THREE.Mesh(screwTopGeo, screwTopMat);
    screw.position.set(pos.x, 0.21, pos.z);
    boardGroup.add(screw);
  });

  // B. AUTHENTIC 3D MOTHERBOARD HARDWARE STRUCTURES
  // 1. Rear I/O Panel Shield (Left Edge x: -7.0) with Physical RJ45 Ethernet Network Port
  const ioShieldGeo = new THREE.BoxGeometry(0.35, 1.1, 7.8);
  const ioShieldMat = new THREE.MeshStandardMaterial({
    color: 0x8a9ba8,
    metalness: 0.9,
    roughness: 0.2,
  });
  const ioShield = new THREE.Mesh(ioShieldGeo, ioShieldMat);
  ioShield.position.set(-pcbW * 0.47, 0.55, 0.4);
  boardGroup.add(ioShield);

  // RJ45 Gigabit Ethernet Port Housing
  const rj45Geo = new THREE.BoxGeometry(0.85, 0.58, 0.8);
  const rj45Mat = new THREE.MeshStandardMaterial({
    color: 0x243444,
    metalness: 0.85,
    roughness: 0.25,
  });
  const rj45Mesh = new THREE.Mesh(rj45Geo, rj45Mat);
  rj45Mesh.position.set(-pcbW * 0.43, 0.3, 1.8);
  boardGroup.add(rj45Mesh);

  // RJ45 Dual Link LEDs (Green Link & Amber Activity)
  const rj45LedG = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00ff66 }));
  rj45LedG.position.set(-pcbW * 0.41, 0.52, 1.55);
  boardGroup.add(rj45LedG);

  const rj45LedA = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
  rj45LedA.position.set(-pcbW * 0.41, 0.52, 2.05);
  boardGroup.add(rj45LedA);

  // USB 3.0 Dual Port Stack
  const usb3Geo = new THREE.BoxGeometry(0.75, 0.55, 0.65);
  const usb3Mat = new THREE.MeshStandardMaterial({
    color: 0x0055bb,
    metalness: 0.7,
    roughness: 0.3,
  });
  const usb3Mesh = new THREE.Mesh(usb3Geo, usb3Mat);
  usb3Mesh.position.set(-pcbW * 0.43, 0.28, 0.6);
  boardGroup.add(usb3Mesh);

  // 2. Central CPU Socket Frame & Aluminum VRM Cooling Heatsinks
  const socketGeo = new THREE.BoxGeometry(2.8, 0.08, 2.8);
  const socketMat = new THREE.MeshStandardMaterial({
    color: 0x122432,
    metalness: 0.85,
    roughness: 0.2,
  });
  const socketMesh = new THREE.Mesh(socketGeo, socketMat);
  socketMesh.position.set(0, 0.04, 0);
  boardGroup.add(socketMesh);

  const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.7, 8);
  const armMat = new THREE.MeshStandardMaterial({ color: 0xd4d8dc, metalness: 0.95, roughness: 0.1 });
  const armMesh = new THREE.Mesh(armGeo, armMat);
  armMesh.rotation.z = Math.PI / 2;
  armMesh.position.set(0, 0.1, 1.45);
  boardGroup.add(armMesh);

  // Aluminum VRM Finned Heatsink (North of CPU)
  const vrmNorthGroup = new THREE.Group();
  vrmNorthGroup.position.set(0, 0, -1.8);
  const vrmBaseGeo = new THREE.BoxGeometry(2.8, 0.15, 0.7);
  const vrmMat = new THREE.MeshStandardMaterial({
    color: 0x182c3c,
    metalness: 0.9,
    roughness: 0.25,
  });
  vrmNorthGroup.add(new THREE.Mesh(vrmBaseGeo, vrmMat));
  const finGeo = new THREE.BoxGeometry(0.06, 0.4, 0.65);
  for (let f = 0; f < 12; f++) {
    const fin = new THREE.Mesh(finGeo, vrmMat);
    fin.position.set(-1.25 + f * 0.23, 0.25, 0);
    vrmNorthGroup.add(fin);
  }
  boardGroup.add(vrmNorthGroup);

  // Aluminum VRM Finned Heatsink (West of CPU)
  const vrmWestGroup = new THREE.Group();
  vrmWestGroup.position.set(-1.8, 0, 0);
  const vrmWestBaseGeo = new THREE.BoxGeometry(0.7, 0.15, 2.6);
  vrmWestGroup.add(new THREE.Mesh(vrmWestBaseGeo, vrmMat));
  const finWestGeo = new THREE.BoxGeometry(0.65, 0.4, 0.06);
  for (let f = 0; f < 11; f++) {
    const fin = new THREE.Mesh(finWestGeo, vrmMat);
    fin.position.set(0, 0.25, -1.15 + f * 0.23);
    vrmWestGroup.add(fin);
  }
  boardGroup.add(vrmWestGroup);

  // 3. DDR5 RAM Memory DIMM Slots (East of CPU)
  const dimmSlotGeo = new THREE.BoxGeometry(0.18, 0.22, 2.6);
  const dimmSlotMat = new THREE.MeshStandardMaterial({
    color: 0x09141e,
    roughness: 0.5,
  });
  const dimm1 = new THREE.Mesh(dimmSlotGeo, dimmSlotMat);
  dimm1.position.set(1.7, 0.11, 0);
  boardGroup.add(dimm1);

  const dimm2 = new THREE.Mesh(dimmSlotGeo, dimmSlotMat);
  dimm2.position.set(2.05, 0.11, 0);
  boardGroup.add(dimm2);

  const stickGeo = new THREE.BoxGeometry(0.06, 0.48, 2.5);
  const stickMat = new THREE.MeshStandardMaterial({
    color: 0x162c3e,
    metalness: 0.85,
    roughness: 0.2,
  });
  const stick1 = new THREE.Mesh(stickGeo, stickMat);
  stick1.position.set(1.7, 0.32, 0);
  boardGroup.add(stick1);

  const stick2 = new THREE.Mesh(stickGeo, stickMat);
  stick2.position.set(2.05, 0.32, 0);
  boardGroup.add(stick2);

  // 4. PCIe Gen5 x16 Expansion Slot (South)
  const pcieSlotGeo = new THREE.BoxGeometry(4.2, 0.24, 0.22);
  const pcieSlotMat = new THREE.MeshStandardMaterial({ color: 0x08131d, roughness: 0.4 });
  const pcieSlot = new THREE.Mesh(pcieSlotGeo, pcieSlotMat);
  pcieSlot.position.set(0.2, 0.12, -3.4);
  boardGroup.add(pcieSlot);

  // 5. ATX 24-Pin Power Connector
  const atxGeo = new THREE.BoxGeometry(0.65, 0.45, 1.8);
  const atxMat = new THREE.MeshStandardMaterial({ color: 0x0e1c28, roughness: 0.6 });
  const atxMesh = new THREE.Mesh(atxGeo, atxMat);
  atxMesh.position.set(pcbW * 0.42, 0.225, 0);
  boardGroup.add(atxMesh);

  // 6. SATA 6Gbps Storage Port Block
  const sataGeo = new THREE.BoxGeometry(0.7, 0.4, 0.85);
  const sataMat = new THREE.MeshStandardMaterial({ color: 0x050c14, roughness: 0.5 });
  const sataMesh = new THREE.Mesh(sataGeo, sataMat);
  sataMesh.position.set(pcbW * 0.41, 0.2, -2.4);
  boardGroup.add(sataMesh);

  // C. ANIMATED LASER SCANLINE & RADIAL ENERGY PULSES
  const scanlineGeo = new THREE.PlaneGeometry(pcbW * 0.96, 0.25);
  const scanlineMat = new THREE.MeshBasicMaterial({
    color: 0x38e1f0,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const scanlineMesh = new THREE.Mesh(scanlineGeo, scanlineMat);
  scanlineMesh.rotation.x = -Math.PI / 2;
  scanlineMesh.position.y = 0.025;
  boardGroup.add(scanlineMesh);

  const rippleGeo = new THREE.RingGeometry(0.1, 0.25, 48);
  const rippleMat = new THREE.MeshBasicMaterial({
    color: 0xff2a6d,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const rippleMesh = new THREE.Mesh(rippleGeo, rippleMat);
  rippleMesh.rotation.x = -Math.PI / 2;
  rippleMesh.position.set(-4.4, 0.03, 1.8);
  boardGroup.add(rippleMesh);

  // Helper to draw authentic geometric vector service symbols
  function drawServiceSymbol(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, id: number, color: string) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (id === 0) {
      // [API_GATEWAY] - Hexagon routing portal + Ingress arrows ⇄
      const r = size * 0.46;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - r * 0.45, cy - r * 0.2);
      ctx.lineTo(cx + r * 0.45, cy - r * 0.2);
      ctx.lineTo(cx + r * 0.2, cy - r * 0.4);
      ctx.moveTo(cx + r * 0.45, cy + r * 0.2);
      ctx.lineTo(cx - r * 0.45, cy + r * 0.2);
      ctx.lineTo(cx - r * 0.2, cy + r * 0.4);
      ctx.stroke();
    } else if (id === 1) {
      // [AUTH_COGNITO] - Security Shield 🛡 with Keyhole
      const w = size * 0.4;
      const h = size * 0.5;
      ctx.beginPath();
      ctx.moveTo(cx - w, cy - h * 0.7);
      ctx.lineTo(cx + w, cy - h * 0.7);
      ctx.lineTo(cx + w, cy);
      ctx.quadraticCurveTo(cx + w * 0.8, cy + h * 0.9, cx, cy + h);
      ctx.quadraticCurveTo(cx - w * 0.8, cy + h * 0.9, cx - w, cy);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy - h * 0.1, w * 0.24, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.1, cy - h * 0.08);
      ctx.lineTo(cx + w * 0.1, cy - h * 0.08);
      ctx.lineTo(cx + w * 0.16, cy + h * 0.35);
      ctx.lineTo(cx - w * 0.16, cy + h * 0.35);
      ctx.closePath();
      ctx.fill();
    } else if (id === 2) {
      // [LAMBDA_CLUSTER] - Iconic Greek Lambda λ
      ctx.font = `bold ${Math.round(size * 0.96)}px 'DM Mono', monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("λ", cx, cy + 3);
    } else if (id === 3) {
      // [REDIS_BULLMQ] - Stacked Cache Layers + Lightning Queue ⚡
      const hw = size * 0.4;
      for (let l = 0; l < 2; l++) {
        const ly = cy - 12 + l * 22;
        ctx.beginPath();
        ctx.moveTo(cx - hw, ly);
        ctx.lineTo(cx, ly - 9);
        ctx.lineTo(cx + hw, ly);
        ctx.lineTo(cx, ly + 9);
        ctx.closePath();
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(cx + 3, cy - 20);
      ctx.lineTo(cx - 9, cy + 2);
      ctx.lineTo(cx + 1, cy + 2);
      ctx.lineTo(cx - 3, cy + 22);
      ctx.lineTo(cx + 11, cy);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.fill();
    } else if (id === 4) {
      // [PGSQL_PRIMARY] - 3-Tier Database Cylinder Stack 🗄
      const cw = size * 0.42;
      const ch = 9;
      for (let tier = 0; tier < 3; tier++) {
        const ty = cy - 18 + tier * 18;
        ctx.beginPath();
        ctx.ellipse(cx, ty, cw, ch, 0, 0, Math.PI * 2);
        ctx.stroke();
        if (tier < 2) {
          ctx.beginPath();
          ctx.moveTo(cx - cw, ty);
          ctx.lineTo(cx - cw, ty + 18);
          ctx.moveTo(cx + cw, ty);
          ctx.lineTo(cx + cw, ty + 18);
          ctx.stroke();
        }
      }
    } else if (id === 5) {
      // [S3_VAULT_KMS] - Encrypted Bucket Vault with Padlock 🪣🔒
      const bw = size * 0.38;
      ctx.beginPath();
      ctx.moveTo(cx - bw, cy - 10);
      ctx.lineTo(cx + bw, cy - 10);
      ctx.lineTo(cx + bw * 0.72, cy + 22);
      ctx.lineTo(cx - bw * 0.72, cy + 22);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy - 14, bw * 0.3, Math.PI, 0);
      ctx.stroke();
      ctx.fillRect(cx - bw * 0.26, cy - 13, bw * 0.52, 12);
    }
    ctx.restore();
  }

  // D. 6 PROMINENT MICROCHIP PACKAGES
  interface Microchip {
    id: number;
    name: string;
    subtitle: string;
    spec: string;
    colorHex: number;
    colorCss: string;
    x: number;
    z: number;
    width: number;
    depth: number;
    chipMesh: THREE.Mesh;
    dieMesh: THREE.Mesh;
    ledMesh: THREE.Mesh;
    hudSprite: THREE.Sprite;
    bracketMesh: THREE.LineSegments;
    coreMat: THREE.MeshStandardMaterial;
    dieMat: THREE.MeshStandardMaterial;
    ledMat: THREE.MeshBasicMaterial;
    baseHudY: number;
  }

  const chipDefs = [
    {
      id: 0,
      name: "[API_GATEWAY]",
      subtitle: "Ingress layer · REST & WebSocket",
      spec: "PORT: 443 // SSL_TERMINATION",
      colorHex: 0xff2a6d,
      colorCss: "#FF2A6D",
      x: -4.4,
      z: 1.8,
      w: 1.5,
      d: 1.5,
      isCPU: false,
    },
    {
      id: 1,
      name: "[AUTH_COGNITO]",
      subtitle: "Zero-trust identity & JWT KMS",
      spec: "AES-256 / SHA-256 // SESSION",
      colorHex: 0xff3b30,
      colorCss: "#FF3B30",
      x: -2.2,
      z: 2.8,
      w: 1.4,
      d: 1.4,
      isCPU: false,
    },
    {
      id: 2,
      name: "[LAMBDA_CLUSTER]",
      subtitle: "Scalable Node.js serverless pool",
      spec: "V8_ENGINE // 64_CONCURRENT_POOLS",
      colorHex: 0xff9900,
      colorCss: "#FF9900",
      x: 0,
      z: 0,
      w: 2.4,
      d: 2.4,
      isCPU: true,
    },
    {
      id: 3,
      name: "[REDIS_BULLMQ]",
      subtitle: "Async job queues & cache bus",
      spec: "LOW_LATENCY // RAM_FABRIC",
      colorHex: 0xdc382d,
      colorCss: "#DC382D",
      x: 3.4,
      z: 1.6,
      w: 1.4,
      d: 1.4,
      isCPU: false,
    },
    {
      id: 4,
      name: "[PGSQL_PRIMARY]",
      subtitle: "Distributed PostgreSQL · pgvector",
      spec: "DRIZZLE_ORM // NVME_STORAGE",
      colorHex: 0x3399ff,
      colorCss: "#3399FF",
      x: 3.6,
      z: -1.8,
      w: 1.6,
      d: 1.6,
      isCPU: false,
    },
    {
      id: 5,
      name: "[S3_VAULT_KMS]",
      subtitle: "Encrypted object store · AES envelope",
      spec: "AES-256-GCM // BLIND_STORAGE",
      colorHex: 0x00e676,
      colorCss: "#00E676",
      x: -2.8,
      z: -2.4,
      w: 1.5,
      d: 1.5,
      isCPU: false,
    },
  ];

  const microchips: Microchip[] = [];

  function makeChipTexture(id: number, title: string, subtitle: string, spec: string, colorCss: string, isCPU: boolean) {
    const chipCanvas = document.createElement("canvas");
    chipCanvas.width = 512;
    chipCanvas.height = 512;
    const ctx = chipCanvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = isCPU ? "#081624" : "#05101a";
      ctx.fillRect(0, 0, 512, 512);

      ctx.strokeStyle = colorCss;
      ctx.lineWidth = 6;
      ctx.strokeRect(20, 20, 472, 472);

      ctx.strokeStyle = "rgba(212, 175, 55, 0.7)";
      ctx.lineWidth = 2;
      ctx.strokeRect(32, 32, 448, 448);

      ctx.fillStyle = colorCss;
      ctx.beginPath();
      ctx.arc(56, 56, 14, 0, Math.PI * 2);
      ctx.fill();

      drawServiceSymbol(ctx, 256, 115, 68, id, colorCss);

      ctx.font = isCPU ? "bold 38px 'DM Mono', monospace" : "bold 34px 'DM Mono', monospace";
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = colorCss;
      ctx.shadowBlur = 16;
      ctx.textAlign = "center";
      ctx.fillText(title, 256, 215);
      ctx.shadowBlur = 0;

      ctx.strokeStyle = colorCss;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(80, 250);
      ctx.lineTo(432, 250);
      ctx.stroke();

      ctx.font = "21px 'DM Mono', monospace";
      ctx.fillStyle = colorCss;
      ctx.fillText(subtitle, 256, 295);

      ctx.font = "17px 'DM Mono', monospace";
      ctx.fillStyle = "#9ab6c6";
      ctx.fillText(spec, 256, 345);

      ctx.font = "14px 'DM Mono', monospace";
      ctx.fillStyle = "#d4af37";
      ctx.fillText("KUMARESAN_SYSTEMS // VERIFIED DIE", 256, 440);
    }
    const texture = new THREE.CanvasTexture(chipCanvas);
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  function makeFloatingHudSprite(id: number, title: string, subtitle: string, colorCss: string) {
    const hCanvas = document.createElement("canvas");
    hCanvas.width = 460;
    hCanvas.height = 110;
    const ctx = hCanvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "rgba(4, 12, 22, 0.94)";
      ctx.strokeStyle = colorCss;
      ctx.lineWidth = 3;
      ctx.fillRect(8, 8, 444, 94);
      ctx.strokeRect(8, 8, 444, 94);

      ctx.fillStyle = colorCss;
      ctx.fillRect(6, 6, 14, 4);
      ctx.fillRect(6, 6, 4, 14);
      ctx.fillRect(440, 6, 14, 4);
      ctx.fillRect(450, 6, 4, 14);

      ctx.strokeStyle = colorCss;
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 20, 70, 70);
      drawServiceSymbol(ctx, 55, 55, 46, id, colorCss);

      ctx.textAlign = "left";
      ctx.font = "bold 26px 'DM Mono', monospace";
      ctx.fillStyle = colorCss;
      ctx.fillText(title, 105, 48);

      ctx.font = "16px 'DM Mono', monospace";
      ctx.fillStyle = "#f0f6fa";
      ctx.fillText(subtitle, 105, 78);
    }
    const texture = new THREE.CanvasTexture(hCanvas);
    texture.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.88,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.68, 0.42, 1);
    return sprite;
  }

  const pinGeo = new THREE.BoxGeometry(0.065, 0.05, 0.16);
  const pinMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.95,
    roughness: 0.12,
  });

  function makeBracketGeometry(w: number, d: number) {
    const hw = (w * 0.5) + 0.12;
    const hd = (d * 0.5) + 0.12;
    const bl = 0.22;
    const pts: THREE.Vector3[] = [
      new THREE.Vector3(-hw, 0.18, -hd), new THREE.Vector3(-hw + bl, 0.18, -hd),
      new THREE.Vector3(-hw, 0.18, -hd), new THREE.Vector3(-hw, 0.18, -hd + bl),
      new THREE.Vector3(hw, 0.18, -hd), new THREE.Vector3(hw - bl, 0.18, -hd),
      new THREE.Vector3(hw, 0.18, -hd), new THREE.Vector3(hw, 0.18, -hd + bl),
      new THREE.Vector3(-hw, 0.18, hd), new THREE.Vector3(-hw + bl, 0.18, hd),
      new THREE.Vector3(-hw, 0.18, hd), new THREE.Vector3(-hw, 0.18, hd - bl),
      new THREE.Vector3(hw, 0.18, hd), new THREE.Vector3(hw - bl, 0.18, hd),
      new THREE.Vector3(hw, 0.18, hd), new THREE.Vector3(hw, 0.18, hd - bl),
    ];
    return new THREE.BufferGeometry().setFromPoints(pts);
  }

  for (const def of chipDefs) {
    const chipGroup = new THREE.Group();
    chipGroup.position.set(def.x, 0, def.z);

    const chipBodyGeo = new THREE.BoxGeometry(def.w, 0.22, def.d);
    const chipMat = new THREE.MeshStandardMaterial({
      color: def.isCPU ? 0x091c2c : 0x071522,
      roughness: 0.35,
      metalness: 0.75,
    });
    const chipMesh = new THREE.Mesh(chipBodyGeo, chipMat);
    chipMesh.position.y = 0.11;
    chipGroup.add(chipMesh);

    const dieTexture = makeChipTexture(def.id, def.name, def.subtitle, def.spec, def.colorCss, def.isCPU);
    const dieGeo = new THREE.BoxGeometry(def.w * 0.84, 0.05, def.d * 0.84);
    const dieMat = new THREE.MeshStandardMaterial({
      map: dieTexture,
      roughness: 0.18,
      metalness: 0.65,
      emissive: def.colorHex,
      emissiveIntensity: def.isCPU ? 0.45 : 0.25,
    });
    const dieMesh = new THREE.Mesh(dieGeo, dieMat);
    dieMesh.position.y = 0.235;
    chipGroup.add(dieMesh);

    const ledGeo = new THREE.SphereGeometry(0.045, 12, 12);
    const ledMat = new THREE.MeshBasicMaterial({ color: def.colorHex });
    const ledMesh = new THREE.Mesh(ledGeo, ledMat);
    ledMesh.position.set(def.w * 0.38, 0.27, def.d * 0.38);
    chipGroup.add(ledMesh);

    const numPinsPerSide = Math.max(5, Math.floor(def.w * 6));
    for (let p = 0; p < numPinsPerSide; p++) {
      const offset = (p / (numPinsPerSide - 1) - 0.5) * (def.w * 0.82);
      const pinN = new THREE.Mesh(pinGeo, pinMat);
      pinN.position.set(offset, 0.06, -def.d * 0.52);
      chipGroup.add(pinN);

      const pinS = new THREE.Mesh(pinGeo, pinMat);
      pinS.position.set(offset, 0.06, def.d * 0.52);
      chipGroup.add(pinS);

      const pinW = new THREE.Mesh(pinGeo, pinMat);
      pinW.rotation.y = Math.PI / 2;
      pinW.position.set(-def.w * 0.52, 0.06, offset);
      chipGroup.add(pinW);

      const pinE = new THREE.Mesh(pinGeo, pinMat);
      pinE.rotation.y = Math.PI / 2;
      pinE.position.set(def.w * 0.52, 0.06, offset);
      chipGroup.add(pinE);
    }

    const hudSprite = makeFloatingHudSprite(def.id, def.name, def.subtitle, def.colorCss);
    hudSprite.position.set(0, 0.78, 0);
    chipGroup.add(hudSprite);

    const bracketGeo = makeBracketGeometry(def.w, def.d);
    const bracketMat = new THREE.LineBasicMaterial({
      color: def.colorHex,
      transparent: true,
      opacity: 0.35,
    });
    const bracketMesh = new THREE.LineSegments(bracketGeo, bracketMat);
    bracketMesh.position.y = 0.12;
    chipGroup.add(bracketMesh);

    boardGroup.add(chipGroup);

    microchips.push({
      id: def.id,
      name: def.name,
      subtitle: def.subtitle,
      spec: def.spec,
      colorHex: def.colorHex,
      colorCss: def.colorCss,
      x: def.x,
      z: def.z,
      width: def.w,
      depth: def.d,
      chipMesh,
      dieMesh,
      ledMesh,
      hudSprite,
      bracketMesh,
      coreMat: chipMat,
      dieMat,
      ledMat,
      baseHudY: 0.78,
    });
  }

  // Network Ingress Trace connecting RJ45 Ethernet Port into [API_GATEWAY]
  const ethTracePts = [
    new THREE.Vector3(-pcbW * 0.40, 0.03, 1.8),
    new THREE.Vector3(-5.15, 0.03, 1.8),
  ];
  const ethTraceGeo = new THREE.BufferGeometry().setFromPoints(ethTracePts);
  const ethTraceMat = new THREE.LineBasicMaterial({ color: 0xff2a6d, linewidth: 2 });
  boardGroup.add(new THREE.Line(ethTraceGeo, ethTraceMat));

  // High-Speed RJ45 Live Ingress Traffic Stream Packets
  const ingressSignalGeo = new THREE.SphereGeometry(0.045, 8, 8);
  const ingressSignalMat = new THREE.MeshBasicMaterial({ color: 0xff6584 });
  const ingressPackets: { mesh: THREE.Mesh; progress: number; speed: number }[] = [];
  for (let ip = 0; ip < 4; ip++) {
    const mesh = new THREE.Mesh(ingressSignalGeo, ingressSignalMat);
    boardGroup.add(mesh);
    ingressPackets.push({
      mesh,
      progress: ip * 0.25,
      speed: 0.022 + Math.random() * 0.008,
    });
  }

  // E. EXCLUSIVE SEQUENTIAL CONNECTING PIPELINE:
  // API_GATEWAY -> AUTH_COGNITO -> LAMBDA_CLUSTER -> REDIS_BULLMQ -> PGSQL_PRIMARY -> S3_VAULT_KMS -> API_GATEWAY
  interface TracePath {
    points: THREE.Vector3[];
    cumulativeLengths: number[];
    totalLength: number;
    laneMesh: THREE.Line;
    colorHex: number;
  }

  const tracePaths: TracePath[] = [];

  function createConnectingTrace(
    fromX: number, fromZ: number,
    toX: number, toZ: number,
    colorHex: number,
    lanes = 3
  ) {
    for (let l = 0; l < lanes; l++) {
      const laneOffset = (l - (lanes - 1) / 2) * 0.08;
      const sX = fromX + laneOffset;
      const sZ = fromZ;
      const eX = toX + laneOffset;
      const eZ = toZ;

      const midZ = (sZ + eZ) / 2;
      const bendDist = Math.abs(eX - sX);
      const b1Z = sZ > eZ ? midZ + bendDist * 0.5 : midZ - bendDist * 0.5;
      const b2Z = sZ > eZ ? midZ - bendDist * 0.5 : midZ + bendDist * 0.5;

      const pts = [
        new THREE.Vector3(sX, 0.02, sZ),
        new THREE.Vector3(sX, 0.02, b1Z),
        new THREE.Vector3(eX, 0.02, b2Z),
        new THREE.Vector3(eX, 0.02, eZ),
      ];

      let length = 0;
      const cumulativeLengths = [0];
      for (let i = 0; i < pts.length - 1; i++) {
        length += pts[i].distanceTo(pts[i + 1]);
        cumulativeLengths.push(length);
      }

      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const lineMat = new THREE.LineBasicMaterial({
        color: l === 1 ? colorHex : 0x143448,
        transparent: true,
        opacity: l === 1 ? 0.95 : 0.45,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      boardGroup.add(line);

      tracePaths.push({
        points: pts,
        cumulativeLengths,
        totalLength: length,
        laneMesh: line,
        colorHex,
      });
    }
  }

  // 1. [API_GATEWAY] -> [AUTH_COGNITO] (Rose Magenta #FF2A6D)
  createConnectingTrace(-3.6, 2.1, -2.6, 2.4, 0xff2a6d, 3);
  // 2. [AUTH_COGNITO] -> [LAMBDA_CLUSTER] (Security Crimson #FF3B30)
  createConnectingTrace(-1.8, 2.2, -0.6, 0.8, 0xff3b30, 4);
  // 3. [LAMBDA_CLUSTER] -> [REDIS_BULLMQ] (Lambda Orange #FF9900)
  createConnectingTrace(0.8, 0.6, 2.8, 1.3, 0xff9900, 4);
  // 4. [REDIS_BULLMQ] -> [PGSQL_PRIMARY] (Redis Vermilion #DC382D)
  createConnectingTrace(3.4, 0.8, 3.6, -1.0, 0xdc382d, 3);
  // 5. [PGSQL_PRIMARY] -> [S3_VAULT_KMS] (Postgres Blue #3399FF)
  createConnectingTrace(2.8, -2.0, -2.0, -2.4, 0x3399ff, 4);
  // 6. [S3_VAULT_KMS] -> [API_GATEWAY] (S3 Emerald Green #00E676 - Full Loop)
  createConnectingTrace(-3.2, -1.8, -4.4, 1.0, 0x00e676, 3);

  // F. PASSING SIGNALS (Multi-Bead Comet Trails Flowing along Pipeline)
  interface BusSignal {
    trace: TracePath;
    progress: number;
    speed: number;
    headMesh: THREE.Mesh;
    tail1Mesh: THREE.Mesh;
    tail2Mesh: THREE.Mesh;
    haloMesh: THREE.Mesh;
  }

  const busSignals: BusSignal[] = [];
  const headGeo = new THREE.SphereGeometry(0.06, 8, 8);
  const tail1Geo = new THREE.SphereGeometry(0.042, 8, 8);
  const tail2Geo = new THREE.SphereGeometry(0.026, 8, 8);
  const haloGeo = new THREE.SphereGeometry(0.14, 8, 8);

  for (let i = 0; i < 24; i++) {
    const trace = tracePaths[i % tracePaths.length];

    // Head bead (Bright luminous center)
    const headMat = new THREE.MeshBasicMaterial({ color: trace.colorHex });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    boardGroup.add(headMesh);

    // Tail 1 bead (Trailing midpoint)
    const tail1Mat = new THREE.MeshBasicMaterial({
      color: trace.colorHex,
      transparent: true,
      opacity: 0.7,
    });
    const tail1Mesh = new THREE.Mesh(tail1Geo, tail1Mat);
    boardGroup.add(tail1Mesh);

    // Tail 2 bead (Trailing tip)
    const tail2Mat = new THREE.MeshBasicMaterial({
      color: trace.colorHex,
      transparent: true,
      opacity: 0.35,
    });
    const tail2Mesh = new THREE.Mesh(tail2Geo, tail2Mat);
    boardGroup.add(tail2Mesh);

    // Glowing outer halo
    const haloMat = new THREE.MeshBasicMaterial({
      color: trace.colorHex,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    boardGroup.add(haloMesh);

    busSignals.push({
      trace,
      progress: (i / 24) + Math.random() * 0.05,
      speed: 0.007 + Math.random() * 0.006,
      headMesh,
      tail1Mesh,
      tail2Mesh,
      haloMesh,
    });
  }

  function getPointOnTrace(trace: TracePath, t: number, target: THREE.Vector3): THREE.Vector3 {
    const pts = trace.points;
    const targetDist = Math.max(0, Math.min(1, t)) * trace.totalLength;

    for (let i = 0; i < pts.length - 1; i++) {
      const segmentStart = trace.cumulativeLengths[i];
      const segmentEnd = trace.cumulativeLengths[i + 1];
      if (segmentEnd >= targetDist) {
        const segT = (targetDist - segmentStart) / (segmentEnd - segmentStart);
        return target.lerpVectors(pts[i], pts[i + 1], segT);
      }
    }
    return target.copy(pts[pts.length - 1]);
  }

  // G. VOLUMETRIC CYBER DUST PARTICLES
  const dustCount = 84;
  const dustGeo = new THREE.BufferGeometry();
  const dustPositions = new Float32Array(dustCount * 3);
  const dustSpeeds = new Float32Array(dustCount);

  for (let d = 0; d < dustCount; d++) {
    dustPositions[d * 3 + 0] = (Math.random() - 0.5) * 16;
    dustPositions[d * 3 + 1] = Math.random() * 4.5;
    dustPositions[d * 3 + 2] = (Math.random() - 0.5) * 14;
    dustSpeeds[d] = 0.003 + Math.random() * 0.005;
  }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));

  const dustMat = new THREE.PointsMaterial({
    color: 0x38e1f0,
    size: 0.045,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
  });
  const dustParticles = new THREE.Points(dustGeo, dustMat);
  boardGroup.add(dustParticles);

  // H. 6 CAMERA PERSPECTIVES (Zero Occlusion, Perfectly Framing Each Service)
  const tabCameraViews = [
    // 0: Origin -> [API_GATEWAY] (Ingress Port beside RJ45 Ethernet)
    { camX: -3.4, camY: 3.8, camZ: 5.6, lookX: -4.0, lookY: 0.1, lookZ: 1.8, activeChip: 0 },
    // 1: About -> [AUTH_COGNITO] (Security Shield)
    { camX: -1.6, camY: 3.6, camZ: 5.8, lookX: -2.2, lookY: 0.1, lookZ: 2.6, activeChip: 1 },
    // 2: Experience -> [LAMBDA_CLUSTER] (Central CPU Socket & Heatsinks)
    { camX: 0, camY: 3.8, camZ: 4.8, lookX: 0, lookY: 0.1, lookZ: 0, activeChip: 2 },
    // 3: Stack -> [REDIS_BULLMQ] (Cache Fabric & DDR5 Slots)
    { camX: 2.6, camY: 3.6, camZ: 5.4, lookX: 3.2, lookY: 0.1, lookZ: 1.4, activeChip: 3 },
    // 4: Projects -> [PGSQL_PRIMARY] (Database & NVMe / SATA)
    { camX: 2.8, camY: 3.8, camZ: 4.2, lookX: 3.4, lookY: 0.1, lookZ: -1.8, activeChip: 4 },
    // 5: Contact -> [S3_VAULT_KMS] (Encrypted Storage Vault)
    { camX: -2.0, camY: 3.8, camZ: 4.2, lookX: -2.6, lookY: 0.1, lookZ: -2.4, activeChip: 5 },
  ];

  let currentLookAt = new THREE.Vector3(-4.0, 0.1, 1.8);
  let baseCamPos = new THREE.Vector3(-3.4, 3.8, 5.6);

  // Mouse Parallax Offsets
  let mouseTargetX = 0;
  let mouseTargetY = 0;
  let mouseCurrentX = 0;
  let mouseCurrentY = 0;

  function onMouseMove(e: MouseEvent) {
    mouseTargetX = (e.clientX / window.innerWidth - 0.5) * 0.45;
    mouseTargetY = (e.clientY / window.innerHeight - 0.5) * -0.35;
  }
  window.addEventListener("mousemove", onMouseMove, { passive: true });

  let activeChipId = 0;

  function highlightChip(activeIdx: number) {
    activeChipId = activeIdx;
    const activeChip = microchips[activeIdx];

    // Smoothly morph the deep background ambient aura color
    if (activeChip) {
      gsap.to(auraMat.color, {
        r: ((activeChip.colorHex >> 16) & 255) / 255,
        g: ((activeChip.colorHex >> 8) & 255) / 255,
        b: (activeChip.colorHex & 255) / 255,
        duration: 1.2,
        ease: "power2.out",
      });
    }

    microchips.forEach((chip) => {
      const isActive = chip.id === activeIdx;
      if (isActive) {
        chip.coreMat.color.setHex(0x122a3e);
        chip.dieMat.emissive.setHex(chip.colorHex);
        chip.dieMat.emissiveIntensity = 1.4;
        chip.ledMat.color.setHex(0xffffff);

        chip.hudSprite.material.opacity = 1.0;
        chip.baseHudY = 0.96;
        gsap.to(chip.hudSprite.position, { y: 0.96, duration: 0.5, ease: "power2.out" });
        gsap.to(chip.hudSprite.scale, { x: 2.05, y: 0.51, duration: 0.5, ease: "power2.out" });

        chip.bracketMesh.visible = true;
        gsap.to(chip.bracketMesh.material, { opacity: 0.95, duration: 0.4 });
        gsap.to(chip.chipMesh.scale, { y: 1.35, duration: 0.4, yoyo: true, repeat: 1 });
      } else {
        chip.coreMat.color.setHex(0x071522);
        chip.dieMat.emissive.setHex(chip.colorHex);
        chip.dieMat.emissiveIntensity = chip.id === 2 ? 0.35 : 0.2;
        chip.ledMat.color.setHex(chip.colorHex);

        chip.hudSprite.material.opacity = 0.65;
        chip.baseHudY = 0.78;
        gsap.to(chip.hudSprite.position, { y: 0.78, duration: 0.5, ease: "power2.out" });
        gsap.to(chip.hudSprite.scale, { x: 1.68, y: 0.42, duration: 0.5, ease: "power2.out" });

        gsap.to(chip.bracketMesh.material, { opacity: 0.2, duration: 0.4 });
        chip.chipMesh.scale.set(1, 1, 1);
      }
    });

    // Expand radial energy sonar wave from the active chip
    if (activeChip) {
      rippleMesh.position.set(activeChip.x, 0.03, activeChip.z);
      rippleMat.color.setHex(activeChip.colorHex);
      rippleMesh.scale.set(1, 1, 1);
      rippleMat.opacity = 0.85;
      gsap.to(rippleMesh.scale, {
        x: 34,
        y: 34,
        duration: 1.5,
        ease: "power2.out",
      });
      gsap.to(rippleMat, {
        opacity: 0,
        duration: 1.5,
        ease: "power2.out",
      });
    }
  }

  highlightChip(0);

  function onResize() {
    width = window.innerWidth;
    height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.setPixelRatio(getPixelRatio());
  }
  window.addEventListener("resize", onResize);

  let animationId = 0;
  let isVisible = !document.hidden;
  let previousFrameTime = 0;

  function onVisibilityChange() {
    isVisible = !document.hidden;
    if (!isVisible) {
      cancelAnimationFrame(animationId);
      animationId = 0;
      return;
    }

    if (isVisible && !animationId) {
      previousFrameTime = 0;
      animationId = requestAnimationFrame(render);
    }
  }
  document.addEventListener("visibilitychange", onVisibilityChange);

  const startTime = performance.now();
  let scanZ = -5.0;
  let chaserAngle = 0;
  let lastSonarPing = 0;

  function render(now: number) {
    animationId = 0;
    if (!isVisible) return;

    const frameScale = previousFrameTime ? Math.min((now - previousFrameTime) / (1000 / 60), 2) : 1;
    previousFrameTime = now;
    animationId = requestAnimationFrame(render);

    const elapsedTime = (now - startTime) / 1000;

    // 1. Motherboard gentle oscillation
    boardGroup.rotation.z = Math.sin(elapsedTime * 0.25) * 0.015;
    boardGroup.position.y = Math.cos(elapsedTime * 0.3) * 0.05;

    // 2. Ambient Deep Space Aura Breathing
    auraSprite.scale.set(16 + Math.sin(elapsedTime * 1.5) * 1.2, 16 + Math.sin(elapsedTime * 1.5) * 1.2, 1);

    // 3. Scrolling Cyber Horizon Floor Grid Crosslines
    const scrollZ = (elapsedTime * 1.8) % transLineSpacing;
    for (let k = 0; k < transLinesCount; k++) {
      const zPos = -floorGridSize * 0.5 + k * transLineSpacing + scrollZ;
      transLineSegments[k].position.z = zPos;
      // Fade out towards horizon boundary
      const distNorm = 1 - Math.abs((zPos) / (floorGridSize * 0.5));
      (transLineSegments[k].material as THREE.LineBasicMaterial).opacity = Math.max(0, distNorm * 0.45);
    }

    // 4. Perimeter Chaser Photon Light racing around gold edge rail
    chaserAngle += 0.02 * frameScale;
    const halfW = pcbW * 0.48;
    const halfD = pcbD * 0.47;
    const perimeterLen = 2 * (pcbW + pcbD);
    const chasePos = (chaserAngle * 3.5) % perimeterLen;
    if (chasePos < pcbW) {
      chaserMesh.position.set(-halfW + chasePos, 0.025, -halfD);
    } else if (chasePos < pcbW + pcbD) {
      chaserMesh.position.set(halfW, 0.025, -halfD + (chasePos - pcbW));
    } else if (chasePos < 2 * pcbW + pcbD) {
      chaserMesh.position.set(halfW - (chasePos - pcbW - pcbD), 0.025, halfD);
    } else {
      chaserMesh.position.set(-halfW, 0.025, halfD - (chasePos - 2 * pcbW - pcbD));
    }

    // 5. Traveling Laser Scanline
    scanZ += 0.045 * frameScale;
    if (scanZ > 5.5) scanZ = -5.5;
    scanlineMesh.position.z = scanZ;
    const scanNorm = 1 - Math.abs(scanZ / 5.5);
    scanlineMat.opacity = 0.15 + scanNorm * 0.35;

    // 6. Automatic periodic holographic sonar ping from active chip (every 3.2s)
    if (elapsedTime - lastSonarPing > 3.2) {
      lastSonarPing = elapsedTime;
      const activeChip = microchips[activeChipId];
      if (activeChip) {
        rippleMesh.position.set(activeChip.x, 0.03, activeChip.z);
        rippleMat.color.setHex(activeChip.colorHex);
        rippleMesh.scale.set(1, 1, 1);
        rippleMat.opacity = 0.7;
        gsap.to(rippleMesh.scale, {
          x: 32,
          y: 32,
          duration: 1.6,
          ease: "power2.out",
        });
        gsap.to(rippleMat, {
          opacity: 0,
          duration: 1.6,
          ease: "power2.out",
        });
      }
    }

    // 7. Live Network Ingress Traffic Packets into RJ45 Port -> API Gateway
    for (const ip of ingressPackets) {
      ip.progress = (ip.progress + ip.speed * frameScale) % 1;
      const posX = -pcbW * 0.40 + ip.progress * (-5.15 - (-pcbW * 0.40));
      ip.mesh.position.set(posX, 0.035, 1.8);
    }

    // 8. Status LED Activity & Floating HUD Bobbing
    microchips.forEach((chip) => {
      const bob = Math.sin(elapsedTime * 2.2 + chip.id * 1.1) * 0.03;
      chip.hudSprite.position.y = chip.baseHudY + bob;

      if (chip.id === activeChipId) {
        chip.bracketMesh.rotation.y = Math.sin(elapsedTime * 1.5) * 0.05;
        const ledBlink = (Math.sin(elapsedTime * 14 + chip.id * 3) + 1) * 0.5;
        chip.ledMat.color.setRGB(1.0, 0.8 + ledBlink * 0.2, 0.8 + ledBlink * 0.2);
      } else {
        const ambientTick = Math.sin(elapsedTime * 4 + chip.id * 2) > 0.8 ? 1.0 : 0.4;
        chip.ledMat.color.setHex(chip.colorHex);
        chip.ledMat.color.multiplyScalar(ambientTick);
      }
    });

    // 9. Advance data signals with multi-bead comet trails along pipeline
    for (const s of busSignals) {
      s.progress = (s.progress + s.speed * frameScale) % 1;

      // Head
      getPointOnTrace(s.trace, s.progress, s.headMesh.position);
      s.haloMesh.position.copy(s.headMesh.position);

      // Tail 1 (slightly behind head)
      const t1 = (s.progress - 0.025 + 1) % 1;
      getPointOnTrace(s.trace, t1, s.tail1Mesh.position);

      // Tail 2 (further behind head)
      const t2 = (s.progress - 0.05 + 1) % 1;
      getPointOnTrace(s.trace, t2, s.tail2Mesh.position);

      // Halo breathing scale
      const pulse = 1.0 + Math.sin(elapsedTime * 10 + s.progress * 6) * 0.25;
      s.haloMesh.scale.set(pulse, pulse, pulse);
    }

    // 10. Drift floating cyber dust particles
    const positions = dustGeo.attributes.position.array as Float32Array;
    for (let d = 0; d < dustCount; d++) {
      positions[d * 3 + 1] += dustSpeeds[d] * frameScale;
      if (positions[d * 3 + 1] > 4.5) {
        positions[d * 3 + 1] = 0.1;
      }
      positions[d * 3 + 0] += Math.sin(elapsedTime * 0.5 + d) * 0.002 * frameScale;
    }
    dustGeo.attributes.position.needsUpdate = true;

    // 11. Smooth Mouse Parallax
    const parallaxEase = 1 - Math.pow(1 - 0.06, frameScale);
    mouseCurrentX += (mouseTargetX - mouseCurrentX) * parallaxEase;
    mouseCurrentY += (mouseTargetY - mouseCurrentY) * parallaxEase;

    camera.position.x = baseCamPos.x + mouseCurrentX;
    camera.position.y = baseCamPos.y + mouseCurrentY;
    camera.position.z = baseCamPos.z;

    camera.lookAt(currentLookAt);
    renderer.render(scene, camera);
  }

  if (isVisible) animationId = requestAnimationFrame(render);

  return {
    updateScroll: (scroll: number) => {
      baseCamPos.y = 3.8 + Math.sin(scroll * 0.001) * 0.15;
    },
    setTab: (tabIdx: number) => {
      const view = tabCameraViews[tabIdx] || tabCameraViews[0];

      gsap.to(baseCamPos, {
        x: view.camX,
        y: view.camY,
        z: view.camZ,
        duration: 1.35,
        ease: "power2.out",
      });

      gsap.to(currentLookAt, {
        x: view.lookX,
        y: view.lookY,
        z: view.lookZ,
        duration: 1.35,
        ease: "power2.out",
      });

      highlightChip(view.activeChip);
    },
    triggerBurst: () => {
      for (const s of busSignals) {
        s.speed = 0.024 + Math.random() * 0.016;
        gsap.to(s, {
          speed: 0.007 + Math.random() * 0.006,
          duration: 1.3,
          ease: "power2.out",
        });
      }

      scanlineMat.opacity = 0.9;
      gsap.to(scanlineMat, {
        opacity: 0.35,
        duration: 1.2,
        ease: "power2.out",
      });
    },
    destroy: () => {
      cancelAnimationFrame(animationId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      renderer.dispose();
    },
  };
}
