import { appContext } from '../../core/state';
import type { QuestionDraft, QuestionFilter, QuestionType } from '../../types';
import * as Actions from '../../core/actions';

function getActionTarget(event: Event, root: ParentNode, selector: string): HTMLElement | null {
  const target = event.target instanceof Element ? event.target.closest<HTMLElement>(selector) : null;
  return target && root.contains(target) ? target : null;
}

function getInputTarget<T extends HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
  event: Event,
  root: ParentNode,
  selector: string,
): T | null {
  const target = event.target instanceof Element ? event.target.closest(selector) : null;
  return target && root.contains(target) ? (target as T) : null;
}

function readDraftFromDom(root: ParentNode): QuestionDraft {
  const typeInput = root.querySelector<HTMLSelectElement>('#question-type-input');
  const questionInput = root.querySelector<HTMLTextAreaElement>('#question-input');
  const optionsInput = root.querySelector<HTMLTextAreaElement>('#options-input');
  const answerInput = root.querySelector<HTMLTextAreaElement>('#answer-input');

  const type = (typeInput?.value === 'essay' ? 'essay' : 'mcq') as QuestionType;

  return {
    type,
    question: questionInput?.value ?? '',
    options: optionsInput?.value ?? '',
    answer: answerInput?.value ?? '',
  };
}

function syncDraftFromDom(root: ParentNode): void {
  Actions.updateQuestionDraft(readDraftFromDom(root));
}

const LONG_PRESS_MS = 520;

export function bindBankHandlers(root: ParentNode): () => void {
  let longPressTimer: ReturnType<typeof window.setTimeout> | null = null;
  let longPressTriggered = false;

  const clearLongPress = (): void => {
    if (longPressTimer) {
      window.clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  };

  const showCategoryMenu = (categoryId: string): void => {
    const target = appContext.getAppState().categories.find((item) => item.id === categoryId);
    if (!target) {
      return;
    }

    const action = window.prompt('Bấm giữ lĩnh vực:\n1 = Đổi tên\n2 = Xóa lĩnh vực\n\nNhập 1 hoặc 2:', '1');
    if (action === '1') {
      Actions.renameCategory(target);
      return;
    }
    if (action === '2') {
      Actions.deleteCategory(target);
    }
  };

  const onPointerDown = (event: Event): void => {
    const pill = getActionTarget(event, root, '[data-action="select-category"]');
    if (!pill) {
      return;
    }

    const id = pill.dataset.id;
    if (!id) {
      return;
    }

    longPressTriggered = false;
    longPressTimer = window.setTimeout(() => {
      longPressTriggered = true;
      showCategoryMenu(id);
      clearLongPress();
    }, LONG_PRESS_MS);
  };

  const onPointerUp = (): void => {
    clearLongPress();
  };

  const onClick = (event: Event): void => {
    if (longPressTriggered) {
      longPressTriggered = false;
      return;
    }

    const filterButton = getActionTarget(event, root, '[data-action="filter-questions"]');
    if (filterButton?.dataset.filter) {
      Actions.setQuestionFilter(filterButton.dataset.filter as QuestionFilter);
      return;
    }

    const selectCategoryButton = getActionTarget(event, root, '[data-action="select-category"]');
    if (selectCategoryButton) {
      const id = selectCategoryButton.dataset.id;
      if (id) {
        Actions.selectCategory(id);
      }
      return;
    }

    const startEditButton = getActionTarget(event, root, '[data-action="start-edit-question"]');
    if (startEditButton) {
      appContext.setRuntimeState({ editingQuestionId: startEditButton.dataset.id ?? null });
      Actions.ensureQuestionDraft(Actions.currentCategory());
      return;
    }

    if (getActionTarget(event, root, '[data-action="cancel-question-edit"]')) {
      appContext.setRuntimeState({ editingQuestionId: null });
      Actions.ensureQuestionDraft(Actions.currentCategory());
      return;
    }

    const deleteQuestionButton = getActionTarget(event, root, '[data-action="delete-question"]');
    if (deleteQuestionButton) {
      const id = deleteQuestionButton.dataset.id;
      const category = Actions.currentCategory();
      if (!id || !category) {
        return;
      }

      if (!window.confirm('Xóa câu hỏi này?')) {
        return;
      }

      Actions.deleteQuestion(category.id, id);
      return;
    }

    if (getActionTarget(event, root, '[data-action="rename-category"]')) {
      const category = Actions.currentCategory();
      if (category) {
        Actions.renameCategory(category);
      }
      return;
    }

    if (getActionTarget(event, root, '[data-action="delete-category"]')) {
      const category = Actions.currentCategory();
      if (category) {
        Actions.deleteCategory(category);
      }
      return;
    }

    if (getActionTarget(event, root, '[data-action="add-category"]')) {
      Actions.addCategory();
      return;
    }

    if (getActionTarget(event, root, '[data-action="save-question"]')) {
      syncDraftFromDom(root);
      Actions.saveQuestionDraft();
    }
  };

  const onChange = (event: Event): void => {
    const typeInput = getInputTarget<HTMLSelectElement>(event, root, '#question-type-input');
    if (typeInput) {
      syncDraftFromDom(root);
      Actions.setQuestionDraftType(typeInput.value === 'essay' ? 'essay' : 'mcq');
      return;
    }

    const excelInput = getInputTarget<HTMLInputElement>(event, root, '#excel-input');
    if (excelInput) {
      const file = excelInput.files?.[0];
      if (file) {
        Actions.parseExcelImport(file);
      }
      excelInput.value = '';
    }
  };

  const onInput = (event: Event): void => {
    const draftField = getInputTarget<HTMLInputElement | HTMLTextAreaElement>(event, root, '[data-draft-field]');
    if (draftField) {
      syncDraftFromDom(root);
    }
  };

  root.addEventListener('click', onClick);
  root.addEventListener('change', onChange);
  root.addEventListener('input', onInput);
  root.addEventListener('pointerdown', onPointerDown);
  root.addEventListener('pointerup', onPointerUp);
  root.addEventListener('pointercancel', onPointerUp);
  root.addEventListener('pointerleave', onPointerUp);

  return () => {
    clearLongPress();
    root.removeEventListener('click', onClick);
    root.removeEventListener('change', onChange);
    root.removeEventListener('input', onInput);
    root.removeEventListener('pointerdown', onPointerDown);
    root.removeEventListener('pointerup', onPointerUp);
    root.removeEventListener('pointercancel', onPointerUp);
    root.removeEventListener('pointerleave', onPointerUp);
  };
}
