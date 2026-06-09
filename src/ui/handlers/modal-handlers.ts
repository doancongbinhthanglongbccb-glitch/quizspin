import { QUESTION_MODAL_CONFIG } from '../../config/question-modal';
import { appContext } from '../../core/state';
import * as Actions from '../../core/actions';
import { updateQuestionPrepareDom } from '../../utils/question-timer-dom';
import { throttle } from '../../utils/throttle';

const submitAnswer = throttle(() => Actions.submitQuestionAnswer(), 450);

function getActionTarget(event: Event, root: ParentNode, selector: string): HTMLElement | null {
  const target = event.target instanceof Element ? event.target.closest<HTMLElement>(selector) : null;
  return target && root.contains(target) ? target : null;
}

function autoResizeTextarea(textarea: HTMLTextAreaElement): void {
  textarea.style.height = 'auto';
  const nextHeight = Math.min(textarea.scrollHeight, 320);
  textarea.style.height = `${Math.max(nextHeight, 220)}px`;
}

function resizeEssayFields(root: ParentNode): void {
  root.querySelectorAll<HTMLTextAreaElement>('[data-action="player-answer-input"]').forEach(autoResizeTextarea);
}

function syncMcqSelection(root: ParentNode, selectedButton: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('[data-action="choose-answer"]').forEach((button) => {
    const isSelected = button === selectedButton;
    button.classList.toggle('option-chip--selected', isSelected);
    button.setAttribute('aria-checked', isSelected ? 'true' : 'false');
  });
}

function syncEssaySubmitButton(root: ParentNode): void {
  const runtime = appContext.getRuntimeState();
  if (runtime.modal?.kind === 'question' && runtime.modal.isPreparing) {
    root.querySelector<HTMLElement>('[data-action="submit-answer"]')?.remove();
    return;
  }

  const slot = root.querySelector<HTMLElement>('.modal-actions__slot--right');
  const textarea = root.querySelector<HTMLTextAreaElement>('[data-action="player-answer-input"]');
  if (!slot || !textarea) {
    return;
  }

  const hasAnswer = !!textarea.value.trim();
  const submitBtn = slot.querySelector<HTMLButtonElement>('[data-action="submit-answer"]');

  if (hasAnswer && !submitBtn) {
    slot.insertAdjacentHTML(
      'beforeend',
      '<button class="btn btn-submit" data-action="submit-answer">Nộp đáp án</button>',
    );
    return;
  }

  if (!hasAnswer && submitBtn) {
    submitBtn.remove();
  }
}

function syncMcqSelectionFromState(root: ParentNode): void {
  const runtime = appContext.getRuntimeState();
  if (!runtime.modal || runtime.modal.kind !== 'question') {
    return;
  }

  const selectedAnswer = (runtime.modal.selectedAnswer ?? '').trim();
  if (!selectedAnswer) {
    return;
  }

  const buttons = root.querySelectorAll<HTMLElement>('[data-action="choose-answer"]');
  for (const button of buttons) {
    const answer = button.dataset.answer;
    if (answer && decodeURIComponent(answer) === selectedAnswer) {
      syncMcqSelection(root, button);
      return;
    }
  }
}

export function initModalDom(root: ParentNode): void {
  resizeEssayFields(root);
  syncEssaySubmitButton(root);
  syncMcqSelectionFromState(root);

  const runtime = appContext.getRuntimeState();
  if (runtime.modal?.kind === 'question' && runtime.modal.isPreparing) {
    updateQuestionPrepareDom(runtime.modal.prepareRemaining, QUESTION_MODAL_CONFIG.prepareSec);
  }
}

export function bindModalHandlers(root: ParentNode): () => void {
  initModalDom(root);

  const onClick = (event: Event): void => {
    const chooseAnswerButton = getActionTarget(event, root, '[data-action="choose-answer"]');
    if (chooseAnswerButton) {
      const answer = chooseAnswerButton.dataset.answer;
      if (answer) {
        event.preventDefault();
        event.stopPropagation();
        Actions.chooseQuestionAnswer(decodeURIComponent(answer));
        syncMcqSelection(root, chooseAnswerButton);
      }
      return;
    }

    if (getActionTarget(event, root, '[data-action="skip-prepare"]')) {
      Actions.skipQuestionPrepare();
      return;
    }

    if (getActionTarget(event, root, '[data-action="toggle-pause"]')) {
      const runtime = appContext.getRuntimeState();
      if (!runtime.modal || runtime.modal.kind !== 'question') {
        return;
      }

      Actions.toggleQuestionPause();
      return;
    }

    if (getActionTarget(event, root, '[data-action="reveal-answer"]')) {
      Actions.revealAnswer();
      return;
    }

    if (getActionTarget(event, root, '[data-action="submit-answer"]')) {
      submitAnswer();
      return;
    }

    if (getActionTarget(event, root, '[data-action="close-modal"]')) {
      Actions.closeModal();
    }
  };

  const onInput = (event: Event): void => {
    const target = event.target instanceof HTMLTextAreaElement ? event.target : null;
    if (!target || !root.contains(target)) {
      return;
    }

    if (target.matches('[data-action="player-answer-input"]')) {
      autoResizeTextarea(target);
      syncEssaySubmitButton(root);
      Actions.updatePlayerAnswer(target.value);
    }
  };

  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);
  return () => {
    root.removeEventListener('click', onClick);
    root.removeEventListener('input', onInput);
  };
}
