/** Ngưỡng urgency timer — dùng chung cho match-play */
export const QUIZ_CONFIG = {
  /** Cảnh báo vàng khi còn ≤ 5 phút */
  warningThresholdSec: 300,
  /** Cảnh báo đỏ khi còn ≤ N giây */
  dangerThresholdSec: 60,
} as const;
