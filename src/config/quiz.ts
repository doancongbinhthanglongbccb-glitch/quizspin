/** Ngưỡng urgency timer — dùng chung cho match-play */
export const QUIZ_CONFIG = {
  /** Cảnh báo vàng khi còn ≤ nửa thời gian (cận trên) */
  warningThresholdSec: 300,
  /** Cảnh báo đỏ + tick đếm giờ: N giây cuối */
  dangerThresholdSec: 5,
} as const;
