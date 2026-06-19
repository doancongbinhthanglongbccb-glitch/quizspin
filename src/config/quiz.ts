/** Cấu hình bộ thi theo lĩnh vực / thi thử */
export const QUIZ_CONFIG = {
  /** Số câu mỗi đề khi chia lĩnh vực */
  questionsPerExam: 20,
  /** Từ ngưỡng này trở lên mới hiện danh sách nhiều đề */
  minQuestionsForSplit: 20,
  /** Cảnh báo vàng khi còn ≤ 5 phút */
  warningThresholdSec: 300,
  /** Cảnh báo đỏ khi còn ≤ N giây */
  dangerThresholdSec: 60,
  practiceQuestionPresets: [10, 20, 30, 50] as const,
  practiceTimerPresetsMin: [15, 30, 45, 60] as const,
  practiceQuestionMin: 1,
  practiceQuestionMax: 200,
  practiceTimerMinMin: 1,
  practiceTimerMaxMin: 180,
} as const;

export function isUnlimitedQuizTimer(timerSec: number): boolean {
  return timerSec <= 0;
}
