import type { QuestionPools } from '../types';

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
