import type { Category, QuestionPools } from '../types';

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

/** Mọi id đã dùng (có thể trùng category — flatten unique). */
export function collectUsedQuestionIds(pools: QuestionPools): string[] {
  return [...new Set(Object.values(pools).flatMap((ids) => ids))];
}

/** Đếm câu đã dùng còn tồn tại trong ngân hàng. */
export function countUsedQuestionsInBank(pools: QuestionPools, categories: readonly Category[]): number {
  const bankIds = new Set(categories.flatMap((category) => category.questions.map((question) => question.id)));
  return collectUsedQuestionIds(pools).filter((id) => bankIds.has(id)).length;
}

export function markQuestionIdsInPools(
  pools: QuestionPools,
  entries: ReadonlyArray<{ categoryId: string; questionId: string }>,
): QuestionPools {
  if (entries.length === 0) {
    return pools;
  }

  const next: QuestionPools = { ...pools };
  for (const { categoryId, questionId } of entries) {
    if (!categoryId || !questionId) {
      continue;
    }
    const existing = next[categoryId] ?? [];
    if (existing.includes(questionId)) {
      continue;
    }
    next[categoryId] = [...existing, questionId];
  }
  return next;
}
