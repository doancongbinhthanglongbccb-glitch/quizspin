import type { Category } from '../../types';
import { defaultQuestionDraft, questionToDraft } from '../../data';
import { appContext } from '../state';

export function currentCategory(): Category | null {
  const appState = appContext.getAppState();
  const runtime = appContext.getRuntimeState();

  if (!runtime.selectedCategoryId) {
    return appState.categories[0] ?? null;
  }

  return appState.categories.find((category) => category.id === runtime.selectedCategoryId) ?? appState.categories[0] ?? null;
}

export function ensureQuestionDraft(category?: Category | null): void {
  const runtime = appContext.getRuntimeState();

  if (!category) {
    appContext.setRuntimeState({ questionDraft: defaultQuestionDraft('mcq') });
    return;
  }

  if (runtime.editingQuestionId) {
    const item = category.questions.find((question) => question.id === runtime.editingQuestionId);
    if (item) {
      appContext.setRuntimeState({ questionDraft: questionToDraft(item) });
      return;
    }
  }

  appContext.setRuntimeState({ questionDraft: defaultQuestionDraft(runtime.questionDraft.type) });
}

export function selectCategory(categoryId: string): void {
  const appState = appContext.getAppState();
  const category = appState.categories.find((item) => item.id === categoryId);

  appContext.setRuntimeState({ selectedCategoryId: categoryId, editingQuestionId: null, bankFormOpen: false });
  ensureQuestionDraft(category);
}

export { requestAddCategory as addCategory, requestRenameCategory as renameCategory, requestDeleteCategory as deleteCategory } from './confirm-actions';
