// Shared type definitions for the canvas network background.

export interface NeuralNode {
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

export interface PipelineModule {
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

export interface ModuleRenderData {
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
