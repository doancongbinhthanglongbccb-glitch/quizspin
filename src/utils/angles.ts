export function normalizeDeg(angleDeg: number): number {
  const next = angleDeg % 360;
  return next < 0 ? next + 360 : next;
}

export function degreesToRadians(angleDeg: number): number {
  return (angleDeg * Math.PI) / 180;
}
