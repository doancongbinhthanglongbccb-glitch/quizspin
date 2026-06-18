import { appContext } from '../../core/state';
import * as Actions from '../../core/actions';

function getActionTarget(event: Event, root: ParentNode, selector: string): HTMLElement | null {
  const target = event.target instanceof Element ? event.target.closest<HTMLElement>(selector) : null;
  return target && root.contains(target) ? target : null;
}

export function initModalDom(_root: ParentNode): void {
  // Modal quà/phạt — không cần init DOM đặc biệt
}

export function bindModalHandlers(root: ParentNode): () => void {
  const onClick = (event: Event): void => {
    if (getActionTarget(event, root, '[data-action="close-modal"]')) {
      Actions.closeModal();
    }
  };

  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}
