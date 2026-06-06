import * as Actions from '../../core/actions';

function getActionTarget(event: Event, root: ParentNode, selector: string): HTMLElement | null {
  const target = event.target instanceof Element ? event.target.closest<HTMLElement>(selector) : null;
  return target && root.contains(target) ? target : null;
}

export function bindSpinHandlers(root: ParentNode): () => void {
  const onClick = (event: Event): void => {
    if (getActionTarget(event, root, '[data-action="spin"]')) {
      Actions.spin();
      return;
    }

    const recordButton = getActionTarget(event, root, '[data-action="view-answer-record"]');
    if (recordButton?.dataset.recordAt) {
      Actions.openQuestionReview(recordButton.dataset.recordAt);
      return;
    }

    if (getActionTarget(event, root, '[data-action="clear-all"]')) {
      void Actions.clearEverything();
    }
  };

  root.addEventListener('click', onClick);
  return () => {
    root.removeEventListener('click', onClick);
  };
}