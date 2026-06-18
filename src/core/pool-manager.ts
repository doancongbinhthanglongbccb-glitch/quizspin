import type { Category, Question, QuestionPools } from '../types';
import { pickPracticeQuestions, shuffleArray } from '../data';
import { QUIZ_CONFIG } from '../config/quiz';

export type PoolPickResult = {
  questions: Question[];
  /** Pool lĩnh vực đã được reset vì hết câu */
  poolReset: boolean;
};

/** Lấy câu cho bộ thi — tự reset pool khi hết (ghi pool rỗng ngay; thêm id sau khi nộp) */
export function pickCategorySession(
  category: Category,
  pools: QuestionPools,
  maxCount = QUIZ_CONFIG.maxQuestions,
): PoolPickResult {
  let usedIds = [...(pools[category.id] ?? [])];
  let unused = category.questions.filter((item) => !usedIds.includes(item.id));
  let poolReset = false;

  if (unused.length === 0 && category.questions.length > 0) {
    usedIds = [];
    unused = [...category.questions];
    poolReset = true;
  }

  const questions = shuffleArray(unused).slice(0, Math.min(maxCount, unused.length));
  return { questions, poolReset };
}

/** Thi thử: random từ mọi lĩnh vực, không đụng pool */
export function pickPracticeSession(categories: Category[], maxCount = QUIZ_CONFIG.maxQuestions): Question[] {
  return pickPracticeQuestions(categories, maxCount);
}

export function resetCategoryPool(pools: QuestionPools, categoryId: string): QuestionPools {
  const next = { ...pools };
  delete next[categoryId];
  return next;
}

export function resetAllPools(): QuestionPools {
  return {};
}

export function removeQuestionFromPools(pools: QuestionPools, questionId: string): QuestionPools {
  const next: QuestionPools = {};
  for (const [categoryId, ids] of Object.entries(pools)) {
    const filtered = ids.filter((id) => id !== questionId);
    if (filtered.length > 0) {
      next[categoryId] = filtered;
    }
  }
  return next;
}

export function removeCategoryFromPools(pools: QuestionPools, categoryId: string): QuestionPools {
  const next = { ...pools };
  delete next[categoryId];
  return next;
}

export function countUsedInCategory(pools: QuestionPools, categoryId: string): number {
  return (pools[categoryId] ?? []).length;
}
