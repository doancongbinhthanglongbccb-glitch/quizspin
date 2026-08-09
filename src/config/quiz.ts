/** Ngưỡng cảnh báo timer — tái dùng cho phần thi 1 câu/lần (Phase 2+) */
export const QUIZ_CONFIG = {
  /** Cảnh báo vàng khi còn ≤ 5 phút */
  warningThresholdSec: 300,
  /** Cảnh báo đỏ khi còn ≤ N giây */
  dangerThresholdSec: 60,
} as const;
