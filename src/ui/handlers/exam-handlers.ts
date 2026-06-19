import { appContext } from '../../core/state';
import * as Actions from '../../core/actions';

function getActionTarget(event: Event, root: ParentNode): HTMLElement | null {
  const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-action]') : null;
  return target && root.contains(target) ? target : null;
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

    if (action === 'practice-question-preset') {
      const value = target.dataset.value;
      if (!value) {
        return;
      }
      Actions.updatePracticeSetupDraft({
        questionPreset: value === 'custom' ? 'custom' : Number.parseInt(value, 10),
      });
      return;
    }

    if (action === 'practice-timer-preset') {
      const value = target.dataset.value;
      if (!value) {
        return;
      }
      Actions.updatePracticeSetupDraft({
        timerPreset: value as '15' | '30' | '45' | '60' | 'unlimited' | 'custom',
      });
    }
  };

  const onInput = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    if (target.dataset.action === 'practice-custom-count') {
      Actions.patchPracticeSetupDraft({ customQuestionCount: target.value });
      return;
    }

    if (target.dataset.action === 'practice-custom-timer') {
      Actions.patchPracticeSetupDraft({ customTimerMin: target.value });
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
  // Giữ focus trong dialog khi mở
  const card = document.querySelector<HTMLElement>('.exam-picker-card');
  card?.focus();
}
