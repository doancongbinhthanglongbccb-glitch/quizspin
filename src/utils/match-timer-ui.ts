import { QUIZ_CONFIG } from '../config/quiz';

export type MatchTimerUrgency = 'ok' | 'warning' | 'danger';

/** Đồng hồ dạng 29:55 / 45 — dùng cho pill & timebar aria. */
export function formatMatchTimerClock(seconds: number): string {
  if (seconds >= 60) {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }
  return String(seconds);
}

export function matchTimerRatio(remaining: number, total: number): number {
  return Math.max(0, Math.min(1, remaining / Math.max(1, total)));
}

/** Ngưỡng match: max(config, % thời gian câu) — cùng công thức render + tick DOM. */
export function matchTimerUrgency(remaining: number, total: number): MatchTimerUrgency {
  const dangerSec = Math.min(QUIZ_CONFIG.dangerThresholdSec, Math.max(3, Math.ceil(total * 0.25)));
  const warningSec = Math.min(QUIZ_CONFIG.warningThresholdSec, Math.max(dangerSec + 1, Math.ceil(total * 0.5)));
  if (remaining > 0 && remaining <= dangerSec) {
    return 'danger';
  }
  if (remaining > dangerSec && remaining <= warningSec) {
    return 'warning';
  }
  return 'ok';
}

export function matchTimerDangerSec(total: number): number {
  return Math.min(QUIZ_CONFIG.dangerThresholdSec, Math.max(3, Math.ceil(total * 0.25)));
}
