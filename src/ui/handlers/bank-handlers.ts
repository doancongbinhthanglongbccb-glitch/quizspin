import { appContext } from '../../core/state';
import * as Actions from '../../core/actions';

function getActionTarget(event: Event, root: ParentNode, selector: string): HTMLElement | null {
  const target = event.target instanceof Element ? event.target.closest<HTMLElement>(selector) : null;
  return target && root.contains(target) ? target : null;
}

function getInputTarget<T extends HTMLInputElement | HTMLTextAreaElement>(event: Event, root: ParentNode, selector: string): T | null {
  const target = event.target instanceof Element ? event.target.closest(selector) : null;
  return target && root.contains(target) ? (target as T) : null;
}

export function bindBankHandlers(root: ParentNode): () => void {
  const onClick = (event: Event): void => {
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

    const saveEditButton = getActionTarget(event, root, '[data-action="save-question-edit"]');
    if (saveEditButton) {
      const id = saveEditButton.dataset.id;
      const questionInput = root.querySelector<HTMLInputElement>(`[data-field="edit-question"][data-id="${id}"]`);
      const answerInput = root.querySelector<HTMLInputElement>(`[data-field="edit-answer"][data-id="${id}"]`);
      const optionsInput = root.querySelector<HTMLTextAreaElement>(`[data-field="edit-options"][data-id="${id}"]`);
      if (!id || !questionInput || !answerInput || !optionsInput) {
        return;
      }

      Actions.saveQuestionEdit(id, questionInput.value, optionsInput.value, answerInput.value);
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
      Actions.saveQuestionDraft();
    }
  };

  const onInput = (event: Event): void => {
    const excelInput = getInputTarget<HTMLInputElement>(event, root, '#excel-input');
    if (excelInput) {
      const file = excelInput.files?.[0];
      if (file) {
        Actions.parseExcelImport(file);
      }
      excelInput.value = '';
    }
  };

  root.addEventListener('click', onClick);
  root.addEventListener('change', onInput);

  return () => {
    root.removeEventListener('click', onClick);
    root.removeEventListener('change', onInput);
  };
}