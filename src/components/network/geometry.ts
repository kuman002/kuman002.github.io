// Cubic Bézier interpolation used to position signal packets along conduits.
export function getCubicBezierPoint(
  p0x: number,
  p0y: number,
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  p3x: number,
  p3y: number,
  t: number,
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
