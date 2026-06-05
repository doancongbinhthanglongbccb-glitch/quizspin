/**
 * Cấu hình quay vòng — animation + âm thanh.
 *
 * Timeline (5s):
 *   0    → spinBed (nhac-xo-so) + spinStart (spinning-wheel) — đến hết vòng
 *   5000 → dừng cả hai + spinStop
 */
export const SPIN_CONFIG = {
  durationMs: 5000,
  extraSpins: 6,
} as const;
