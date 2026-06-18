import { DEFAULTS } from '../config';

export function clampTimerSeconds(seconds: number): number {
  return Math.min(DEFAULTS.timerMaxSec, Math.max(DEFAULTS.timerMinSec, Math.round(seconds)));
}

/** Giá trị hiển thị trong ô nhập phút; rỗng khi < 1 phút (vd. preset 30s) */
export function timerMinutesInputValue(seconds: number): string {
  if (seconds < 60) {
    return '';
  }
  return String(Math.floor(seconds / 60));
}

export function secondsFromMinutesInput(raw: string): number | null {
  const minutes = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 60) {
    return null;
  }
  return minutes * 60;
}
