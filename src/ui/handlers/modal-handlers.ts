import { appContext } from '../../core/state';
import * as Actions from '../../core/actions';
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

function syncEssaySubmitButton(root: ParentNode): void {
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

export function bindModalHandlers(root: ParentNode): () => void {
  resizeEssayFields(root);
  syncEssaySubmitButton(root);

  const onClick = (event: Event): void => {
    const chooseAnswerButton = getActionTarget(event, root, '[data-action="choose-answer"]');
    if (chooseAnswerButton) {
      const answer = chooseAnswerButton.dataset.answer;
      if (answer) {
        Actions.chooseQuestionAnswer(decodeURIComponent(answer));
        Actions.submitQuestionAnswer();
      }
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
