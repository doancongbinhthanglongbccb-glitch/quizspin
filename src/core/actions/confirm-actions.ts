import type { Category } from '../../types';
import { createSampleState, isMcqQuestion, makeCategory } from '../../data';
import { appContext, createDefaultRuntimeState } from '../state';
import { resetAllPools, resetCategoryPool, removeCategoryFromPools } from '../pool-manager';
import { clearState, saveState, savePools } from '../../storage';
import { currentCategory, ensureQuestionDraft } from './category-actions';
import { deleteQuestion } from './question-actions';
import { closeModal } from './modal-actions';
import { applyPendingBackup, clearPendingBackup } from './backup-actions';
import { showToast } from './shared';

function readConfirmNameInput(): string | null {
  const element = document.getElementById('confirm-name-input');
  if (!(element instanceof HTMLInputElement)) {
    return null;
  }
  const name = element.value.trim();
  return name || null;
}

export function requestDeleteQuestion(categoryId: string, questionId: string): void {
  appContext.setRuntimeState({
    confirmDialog: { kind: 'delete-question', categoryId, questionId },
  });
}

export function requestDeleteCategory(category: Category): void {
  appContext.setRuntimeState({
    confirmDialog: {
      kind: 'delete-category',
      categoryId: category.id,
      categoryName: category.name,
      questionCount: category.questions.filter(isMcqQuestion).length,
    },
  });
}

export function requestClearCategoryQuestions(category: Category): void {
  const questionCount = category.questions.length;
  if (questionCount === 0) {
    showToast('Lĩnh vực này chưa có câu hỏi');
    return;
  }

  appContext.setRuntimeState({
    confirmDialog: {
      kind: 'clear-category-questions',
      categoryId: category.id,
      categoryName: category.name,
      questionCount,
    },
  });
}

export function requestAddCategory(): void {
  appContext.setRuntimeState({ confirmDialog: { kind: 'add-category' } });
}

export function requestRenameCategory(category: Category): void {
  appContext.setRuntimeState({
    confirmDialog: {
      kind: 'rename-category',
      categoryId: category.id,
      categoryName: category.name,
    },
  });
}

export function requestCategoryMenu(category: Category): void {
  appContext.setRuntimeState({
    confirmDialog: {
      kind: 'category-menu',
      categoryId: category.id,
      categoryName: category.name,
    },
  });
}

export function requestClearAllData(): void {
  appContext.setRuntimeState({
    confirmDialog: { kind: 'clear-all-data', step: 1 },
  });
}

export function requestResetAllPools(): void {
  appContext.setRuntimeState({ confirmDialog: { kind: 'reset-all-pools' } });
}

export function requestResetCategoryPool(category: Category): void {
  appContext.setRuntimeState({
    confirmDialog: {
      kind: 'reset-category-pool',
      categoryId: category.id,
      categoryName: category.name,
    },
  });
}

export function cancelConfirmDialog(): void {
  clearPendingBackup();
  appContext.setRuntimeState({ confirmDialog: null });
}

function performAddCategory(name: string): void {
  const nextCategory = makeCategory(name);
  appContext.setAppStateWithoutRender((current) => ({ ...current, categories: [...current.categories, nextCategory] }));
  appContext.setRuntimeState({ selectedCategoryId: nextCategory.id });
  ensureQuestionDraft(nextCategory);
}

function performRenameCategory(categoryId: string, name: string): void {
  appContext.setAppState((current) => ({
    ...current,
    categories: current.categories.map((item) => (item.id === categoryId ? { ...item, name } : item)),
  }));
}

function performClearCategoryQuestions(categoryId: string): void {
  const runtime = appContext.getRuntimeState();
  const category = appContext.getAppState().categories.find((item) => item.id === categoryId);
  if (!category) {
    return;
  }

  const questionIds = new Set(category.questions.map((question) => question.id));

  appContext.setAppState((current) => ({
    ...current,
    categories: current.categories.map((item) =>
      item.id === categoryId ? { ...item, questions: [] } : item,
    ),
  }));

  appContext.setQuestionPools((current) => resetCategoryPool(current, categoryId));

  const editingCleared = Boolean(runtime.editingQuestionId && questionIds.has(runtime.editingQuestionId));
  appContext.setRuntimeState({
    ...(editingCleared ? { editingQuestionId: null, bankFormOpen: false } : {}),
  });

  if (editingCleared || runtime.selectedCategoryId === categoryId) {
    ensureQuestionDraft(currentCategory());
  }

  showToast(`Đã xóa hết câu hỏi trong "${category.name}"`);
}

function performDeleteCategory(categoryId: string): void {
  const runtime = appContext.getRuntimeState();

  appContext.setAppState((current) => {
    const next = current.categories.filter((item) => item.id !== categoryId);
    return { ...current, categories: next.length ? next : [makeCategory('Lĩnh vực mới')] };
  });

  const appState = appContext.getAppState();
  const nextSelectedId =
    runtime.selectedCategoryId === categoryId ? (appState.categories[0]?.id ?? null) : runtime.selectedCategoryId;

  if (nextSelectedId !== runtime.selectedCategoryId) {
    appContext.setRuntimeState({ selectedCategoryId: nextSelectedId });
  }

  ensureQuestionDraft(currentCategory());
  appContext.setQuestionPools((current) => removeCategoryFromPools(current, categoryId));
}

async function performClearAllData(): Promise<void> {
  const sampleState = createSampleState();
  const tab = appContext.getRuntimeState().tab;

  appContext.setAppStateWithoutRender(sampleState);
  appContext.setQuestionPools(resetAllPools());
  appContext.setRuntimeState({
    ...createDefaultRuntimeState(),
    tab,
    selectedCategoryId: sampleState.categories[0]?.id ?? null,
  });

  ensureQuestionDraft(currentCategory());

  await clearState().catch(() => undefined);
  await saveState(appContext.getAppState()).catch(() => undefined);
  await savePools(appContext.getQuestionPools()).catch(() => undefined);

  showToast('Đã khôi phục dữ liệu mẫu');
}

export function confirmRenameCategoryFromMenu(): void {
  const dialog = appContext.getRuntimeState().confirmDialog;
  if (dialog?.kind !== 'category-menu') {
    return;
  }

  appContext.setRuntimeState({
    confirmDialog: {
      kind: 'rename-category',
      categoryId: dialog.categoryId,
      categoryName: dialog.categoryName,
    },
  });
}

export function confirmDeleteCategoryFromMenu(): void {
  const dialog = appContext.getRuntimeState().confirmDialog;
  if (dialog?.kind !== 'category-menu') {
    return;
  }

  const category = appContext.getAppState().categories.find((item) => item.id === dialog.categoryId);
  if (category) {
    requestDeleteCategory(category);
  }
}

export async function confirmDialogAction(): Promise<void> {
  const dialog = appContext.getRuntimeState().confirmDialog;
  if (!dialog) {
    return;
  }

  if (dialog.kind === 'delete-question') {
    appContext.setRuntimeState({ confirmDialog: null });
    deleteQuestion(dialog.categoryId, dialog.questionId);
    return;
  }

  if (dialog.kind === 'delete-category') {
    appContext.setRuntimeState({ confirmDialog: null });
    performDeleteCategory(dialog.categoryId);
    return;
  }

  if (dialog.kind === 'clear-category-questions') {
    appContext.setRuntimeState({ confirmDialog: null });
    performClearCategoryQuestions(dialog.categoryId);
    return;
  }

  if (dialog.kind === 'import-backup') {
    appContext.setRuntimeState({ confirmDialog: null });
    applyPendingBackup();
    return;
  }

  if (dialog.kind === 'add-category') {
    const name = readConfirmNameInput();
    if (!name) {
      showToast('Cần nhập tên lĩnh vực');
      return;
    }
    appContext.setRuntimeState({ confirmDialog: null });
    performAddCategory(name);
    return;
  }

  if (dialog.kind === 'rename-category') {
    const name = readConfirmNameInput();
    if (!name) {
      showToast('Cần nhập tên lĩnh vực');
      return;
    }
    appContext.setRuntimeState({ confirmDialog: null });
    performRenameCategory(dialog.categoryId, name);
    return;
  }

  if (dialog.kind === 'clear-all-data') {
    if (dialog.step === 1) {
      appContext.setRuntimeState({
        confirmDialog: { kind: 'clear-all-data', step: 2 },
      });
      return;
    }

    await performClearAllData();
    appContext.setRuntimeState({ confirmDialog: null });
    return;
  }

  if (dialog.kind === 'reset-all-pools') {
    appContext.setQuestionPools(resetAllPools());
    appContext.setRuntimeState({ confirmDialog: null });
    showToast('Đã reset toàn bộ pool câu hỏi');
    return;
  }

  if (dialog.kind === 'reset-category-pool') {
    appContext.setQuestionPools((current) => resetCategoryPool(current, dialog.categoryId));
    appContext.setRuntimeState({ confirmDialog: null });
    showToast(`Đã reset pool lĩnh vực ${dialog.categoryName}`);
    return;
  }
}
