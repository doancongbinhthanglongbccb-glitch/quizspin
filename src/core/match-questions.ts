import { shuffleArray } from '../data';
import type { Category, MatchExamPack, Question } from '../types';

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

function toExcludeSet(excludeIds: ReadonlySet<string> | readonly string[]): Set<string> {
  return excludeIds instanceof Set ? excludeIds : new Set(excludeIds);
}

/** Toàn bộ câu (MCQ + essay) còn lại trong bank, đã trừ exclude. */
export function collectMatchQuestionPool(
  categories: Category[],
  excludeIds: ReadonlySet<string> | readonly string[],
): Question[] {
  const exclude = toExcludeSet(excludeIds);
  return categories.flatMap((category) => category.questions.filter((q) => !exclude.has(q.id)));
}

export type BuildRound2ExamPacksResult = {
  packs: MatchExamPack[];
  /** Số câu còn lại tại thời điểm sinh pack (sau usedQuestionIds) */
  available: number;
  questionsPerPack: number;
};

/**
 * Sinh N bộ đề Lượt 2 không overlap lẫn nhau / với used.
 * N = floor(available / questionsPerPack); available < 1 pack → packs rỗng.
 */
export function buildRound2ExamPacks(
  categories: Category[],
  options: { questionsPerPack: number; excludeIds: ReadonlySet<string> | readonly string[] },
): BuildRound2ExamPacksResult {
  const questionsPerPack = Math.max(1, Math.floor(options.questionsPerPack));
  const pool = shuffleArray(collectMatchQuestionPool(categories, options.excludeIds));
  const available = pool.length;

  if (available < questionsPerPack) {
    return { packs: [], available, questionsPerPack };
  }

  const packCount = Math.floor(available / questionsPerPack);
  const packs: MatchExamPack[] = [];
  for (let i = 0; i < packCount; i += 1) {
    const start = i * questionsPerPack;
    const slice = pool.slice(start, start + questionsPerPack);
    packs.push({
      id: `match-exam-pack-${i + 1}`,
      index: i + 1,
      title: `Đề số ${i + 1}`,
      questionIds: slice.map((q) => q.id),
    });
  }

  return { packs, available, questionsPerPack };
}
