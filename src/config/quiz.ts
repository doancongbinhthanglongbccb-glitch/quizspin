/** Cấu hình bộ thi theo lĩnh vực / thi thử */
export const QUIZ_CONFIG = {
  maxQuestions: 20,
  /** Cảnh báo vàng khi còn ≤ 5 phút */
  warningThresholdSec: 300,
  /** Cảnh báo đỏ khi còn ≤ N giây */
  dangerThresholdSec: 60,
} as const;
