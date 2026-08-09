export const DEFAULT_PALETTE = ['#ffb703', '#4cc9f0', '#f72585', '#90be6d', '#f9844a', '#4895ef', '#b5179e', '#43aa8b'];

import { SPIN_CONFIG } from './config/spin';

export const DEFAULTS = {
  spinFullTurns: SPIN_CONFIG.extraSpins,
  pointerOffsetDeg: 0, // kim cố định bên phải (3h); segment 0 bắt đầu từ 3h
  toastDurationMs: 2600,
  timerMinSec: 10,
  timerMaxSec: 3600, // 60 phút
  /** Bước tăng/giảm nút ± (1 phút) */
  timerStepSec: 60,
  questionPoints: 10,
};

/** Nút nhanh thời gian bộ thi */
export const TIMER_PRESETS = [
  { sec: 30, label: '30s' },
  { sec: 60, label: '1p' },
  { sec: 300, label: '5p' },
  { sec: 600, label: '10p' },
  { sec: 900, label: '15p' },
  { sec: 1200, label: '20p' },
  { sec: 1500, label: '25p' },
  { sec: 1800, label: '30p' },
  { sec: 2700, label: '45p' },
  { sec: 3600, label: '60p' },
] as const;

export const DEFAULT_TIMER_SEC = 1800;
