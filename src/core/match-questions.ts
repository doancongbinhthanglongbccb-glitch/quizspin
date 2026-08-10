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

/**
 * Lấy câu từ một lĩnh vực. Nếu thiếu sau khi trừ used → reset used của lĩnh vực đó rồi lấy lại.
 * Vẫn fail nếu tổng câu trong lĩnh vực < count.
 */
export function pickMatchQuestionsFromCategoryAllowReset(
  category: Category,
  options: { count: number; excludeIds: ReadonlySet<string> | readonly string[] },
): PickMatchQuestionsResult & { resetApplied: boolean } {
  const first = pickMatchQuestionsFromCategory(category, options);
  if (first.questions.length >= first.requested) {
    return { ...first, resetApplied: false };
  }

  const categoryIds = new Set(category.questions.map((question) => question.id));
  const excludeList = options.excludeIds instanceof Set ? [...options.excludeIds] : [...options.excludeIds];
  const excludeOutsideCategory = excludeList.filter((id) => !categoryIds.has(id));
  const second = pickMatchQuestionsFromCategory(category, {
    count: options.count,
    excludeIds: excludeOutsideCategory,
  });

  return { ...second, resetApplied: true };
}

function toExcludeSet(excludeIds: ReadonlySet<string> | readonly string[]): Set<string> {
  return excludeIds instanceof Set ? excludeIds : new Set(excludeIds);
}

/** Toàn bộ câu (MCQ + essay) còn lại trong bank, đã trừ exclude. */
function collectMatchQuestionPool(
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
 * Sinh N bộ đề Tổng hợp không overlap lẫn nhau / với used.
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

/** Bộ đã hỏi hết mọi câu → không còn lên bánh xe. */
export function isMatchExamPackUsed(
  pack: MatchExamPack,
  usedQuestionIds: ReadonlySet<string> | readonly string[],
): boolean {
  if (pack.questionIds.length === 0) {
    return true;
  }
  const used = toExcludeSet(usedQuestionIds);
  return pack.questionIds.every((id) => used.has(id));
}

export function getAvailableMatchExamPacks(
  packs: readonly MatchExamPack[],
  usedQuestionIds: ReadonlySet<string> | readonly string[],
): MatchExamPack[] {
  return packs.filter((pack) => !isMatchExamPackUsed(pack, usedQuestionIds));
}

/** Cửa sổ tối đa `limit` bộ chưa dùng (thứ tự pool ổn định). */
export function getMatchWheelExamPacks(
  packs: readonly MatchExamPack[],
  usedQuestionIds: ReadonlySet<string> | readonly string[],
  limit: number,
): MatchExamPack[] {
  const max = Math.max(0, Math.floor(limit));
  return getAvailableMatchExamPacks(packs, usedQuestionIds).slice(0, max);
}

/**
 * Lấy câu từ toàn bank (MCQ + essay), loại trừ used, random — dùng Lượt 3 (và chỗ cần pool chung).
 */
export function pickMatchQuestionsFromBank(
  categories: Category[],
  options: { count: number; excludeIds: ReadonlySet<string> | readonly string[] },
): PickMatchQuestionsResult {
  const pool = shuffleArray(collectMatchQuestionPool(categories, options.excludeIds));
  const requested = Math.max(0, Math.floor(options.count));
  const questions = pool.slice(0, Math.min(requested, pool.length));

  return {
    questions,
    requested,
    available: pool.length,
  };
}
