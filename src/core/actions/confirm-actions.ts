import type { Category } from '../../types';
import { createSampleState, makeCategory } from '../../data';
import { appContext } from '../state';
import { clearState, saveState } from '../../storage';
import { currentCategory, ensureQuestionDraft } from './category-actions';
import { deleteQuestion } from './question-actions';
import { closeModal } from './modal-actions';
import { showToast, stopTimer } from './shared';

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

export function requestClearAllData(): void {
  appContext.setRuntimeState({
    confirmDialog: { kind: 'clear-all-data', step: 1 },
  });
}

export function cancelConfirmDialog(): void {
  appContext.setRuntimeState({ confirmDialog: null });
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

  const nextRuntime = appContext.getRuntimeState();
  if (nextRuntime.selectedCategoryId === categoryId) {
    appContext.setRuntimeState({ selectedCategoryId: appContext.getAppState().categories[0]?.id ?? null });
  }

  ensureQuestionDraft(currentCategory());
}

async function performClearAllData(): Promise<void> {
  const sampleState = createSampleState();
  appContext.setAppState(sampleState);

  stopTimer();
  appContext.setRuntimeState({
    selectedCategoryId: sampleState.categories[0]?.id ?? null,
    editingQuestionId: null,
    modal: null,
    usedQuestionIds: new Set(),
    usedGifts: new Set(),
    usedPunishments: new Set(),
    importReport: null,
    confirmDialog: null,
    settingsSection: 'timer',
    settingsDraft: null,
  });

  ensureQuestionDraft(currentCategory());

  await clearState().catch(() => undefined);
  await saveState(appContext.getAppState()).catch(() => undefined);

  showToast('Đã khôi phục dữ liệu mẫu');
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

  if (dialog.step === 1) {
    appContext.setRuntimeState({
      confirmDialog: { kind: 'clear-all-data', step: 2 },
    });
    return;
  }

  await performClearAllData();
}
