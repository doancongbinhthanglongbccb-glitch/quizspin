import { shuffleArray } from '../data';
import type { Category, Question } from '../types';

export type PickMatchQuestionsResult = {
  questions: Question[];
  /** Số câu Settings yêu cầu */
  requested: number;
  /** Số câu khả dụng trước khi cắt */
  available: number;
};

/**
 * Lấy câu cho match từ một lĩnh vực — MCQ + essay, loại trừ id đã dùng, random.
 * Không dùng generateCategoryExams (chỉ MCQ).
 */
export function pickMatchQuestionsFromCategory(
  category: Category,
  options: { count: number; excludeIds: ReadonlySet<string> | readonly string[] },
): PickMatchQuestionsResult {
  const exclude = options.excludeIds instanceof Set ? options.excludeIds : new Set(options.excludeIds);
  const pool = category.questions.filter((q) => !exclude.has(q.id));
  const requested = Math.max(0, Math.floor(options.count));
  const questions = shuffleArray(pool).slice(0, Math.min(requested, pool.length));

  return {
    questions,
    requested,
    available: pool.length,
  };
}
