import { appContext } from '../../core/state';
import * as Actions from '../../core/actions';

function getActionTarget(event: Event, root: ParentNode, selector: string): HTMLElement | null {
  const target = event.target instanceof Element ? event.target.closest<HTMLElement>(selector) : null;
  return target && root.contains(target) ? target : null;
}

export function bindModalHandlers(root: ParentNode): () => void {
  const onClick = (event: Event): void => {
    const chooseAnswerButton = getActionTarget(event, root, '[data-action="choose-answer"]');
    if (chooseAnswerButton) {
      const answer = chooseAnswerButton.dataset.answer;
      if (answer) {
        Actions.chooseQuestionAnswer(decodeURIComponent(answer));
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

    if (getActionTarget(event, root, '[data-action="close-modal"]')) {
      Actions.closeModal();
    }
  };

  root.addEventListener('click', onClick);
  return () => {
    root.removeEventListener('click', onClick);
  };
}