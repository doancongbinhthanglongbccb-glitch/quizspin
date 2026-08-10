/** Palette vòng quay — đỏ/vàng/xanh hội trường */
export const DEFAULT_PALETTE = ['#d4a017', '#b42318', '#1a4d3e', '#c45c26', '#2d6a4f', '#8f1c14', '#a67c00', '#3d5a40'];

/** Số lĩnh vực tối đa trong Ngân hàng (đủ cho vòng quay) */
export const MAX_CATEGORIES = 8;

/** Số lát tối đa trên bánh xe (lĩnh vực / bộ đề Tổng hợp) */
export const MAX_WHEEL_SEGMENTS = 8;

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
