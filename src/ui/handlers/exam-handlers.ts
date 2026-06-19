import { appContext } from '../../core/state';
import * as Actions from '../../core/actions';

function getActionTarget(event: Event, root: ParentNode): HTMLElement | null {
  const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-action]') : null;
  return target && root.contains(target) ? target : null;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function bindExamHandlers(root: ParentNode = document): () => void {
  const onClick = (event: Event): void => {
    const target = getActionTarget(event, root);
    if (!target) {
      return;
    }

    const action = target.dataset.action;
    if (!action) {
      return;
    }

    if (action === 'cancel-exam-picker') {
      Actions.closeExamPicker();
      return;
    }

    if (action === 'select-category-exam') {
      const examId = target.dataset.examId;
      if (examId) {
        Actions.selectCategoryExam(examId);
      }
      return;
    }

    if (action === 'start-practice-exam') {
      Actions.startPracticeFromSetup();
      return;
    }

    if (action === 'practice-timer-unlimited' && target instanceof HTMLInputElement) {
      Actions.patchPracticeSetupDraft({ timerUnlimited: target.checked });
      const timerInput = root.querySelector<HTMLInputElement>('[data-action="practice-timer-min"]');
      if (timerInput) {
        timerInput.disabled = target.checked;
      }
    }
  };

  const onInput = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    if (target.dataset.action === 'practice-question-count') {
      const value = digitsOnly(target.value);
      if (value !== target.value) {
        target.value = value;
      }
      Actions.patchPracticeSetupDraft({ questionCount: value });
      return;
    }

    if (target.dataset.action === 'practice-timer-min') {
      const value = digitsOnly(target.value);
      if (value !== target.value) {
        target.value = value;
      }
      Actions.patchPracticeSetupDraft({ timerMin: value });
    }
  };

  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);
  return () => {
    root.removeEventListener('click', onClick);
    root.removeEventListener('input', onInput);
  };
}

export function initExamPickerDom(): void {
  const card = document.querySelector<HTMLElement>('.exam-picker-card');
  card?.focus();
}
