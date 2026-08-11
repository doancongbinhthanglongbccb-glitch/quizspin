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

/** Ngưỡng match: đỏ = N giây cuối (mặc định 5); vàng = nửa thời gian. */
export function matchTimerUrgency(remaining: number, total: number): MatchTimerUrgency {
  const dangerSec = matchTimerDangerSec(total);
  const warningSec = Math.min(QUIZ_CONFIG.warningThresholdSec, Math.max(dangerSec + 1, Math.ceil(total * 0.5)));
  if (remaining > 0 && remaining <= dangerSec) {
    return 'danger';
  }
  if (remaining > dangerSec && remaining <= warningSec) {
    return 'warning';
  }
  return 'ok';
}

/** Số giây cuối phát tick — cố định theo config, không vượt quá thời gian câu. */
export function matchTimerDangerSec(total: number): number {
  return Math.min(QUIZ_CONFIG.dangerThresholdSec, Math.max(1, total));
}
