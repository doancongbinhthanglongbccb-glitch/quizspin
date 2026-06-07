import type { Category } from '../../types';
import { createSampleState, makeCategory } from '../../data';
import { appContext, createDefaultRuntimeState } from '../state';
import { clearState, saveState } from '../../storage';
import { currentCategory, ensureQuestionDraft } from './category-actions';
import { deleteQuestion } from './question-actions';
import { closeModal } from './modal-actions';
import { showToast, stopTimer } from './shared';

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
      questionCount: category.questions.length,
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

export function cancelConfirmDialog(): void {
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

function performDeleteCategory(categoryId: string): void {
  const runtime = appContext.getRuntimeState();
  if (runtime.modal?.kind === 'question' && runtime.modal.categoryId === categoryId) {
    closeModal();
  }

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
}

async function performClearAllData(): Promise<void> {
  const sampleState = createSampleState();
  const tab = appContext.getRuntimeState().tab;

  stopTimer();

  appContext.setAppStateWithoutRender(sampleState);
  appContext.setRuntimeState({
    ...createDefaultRuntimeState(),
    tab,
    selectedCategoryId: sampleState.categories[0]?.id ?? null,
  });

  ensureQuestionDraft(currentCategory());

  await clearState().catch(() => undefined);
  await saveState(appContext.getAppState()).catch(() => undefined);

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
  }
}
