import type { WheelSegment } from './types';

export const DEFAULT_PALETTE = ['#ffb703', '#4cc9f0', '#f72585', '#90be6d', '#f9844a', '#4895ef', '#b5179e', '#43aa8b'];

export const DEFAULT_FIXED_SEGMENTS: WheelSegment[] = [
  { id: 'gift', label: 'Quà tặng', kind: 'gift', color: '#ff8fab' },
  { id: 'punishment', label: 'Xử phạt', kind: 'punishment', color: '#f94144' },
  { id: 'extra-turn', label: 'Thêm lượt', kind: 'extraTurn', color: '#90be6d' },
  { id: 'lose-turn', label: 'Mất lượt', kind: 'loseTurn', color: '#577590' },
];

export const DEFAULTS = {
  spinFullTurns: 6, // number of full revolutions before landing
  spinDurationMs: 5200, // fallback spin animation timeout
  pointerOffsetDeg: 90, // pointer location offset used for rotation math
  toastDurationMs: 2600,
  timerMinSec: 10,
  timerMaxSec: 60,
  questionPoints: 10,
};

export default DEFAULTS;
