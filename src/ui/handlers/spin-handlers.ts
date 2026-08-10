import * as Actions from '../../core/actions';
import type { MatchRoundId } from '../../types';

function getActionTarget(event: Event, root: ParentNode, selector: string): HTMLElement | null {
  const target = event.target instanceof Element ? event.target.closest<HTMLElement>(selector) : null;
  return target && root.contains(target) ? target : null;
}

function parseRound(value: string | undefined): MatchRoundId | null {
  if (value === '1' || value === '2' || value === '3') {
    return Number(value) as MatchRoundId;
  }
  return null;
}

export function bindSpinHandlers(root: ParentNode): () => void {
  const onClick = (event: Event): void => {
    const roundTab = getActionTarget(event, root, '[data-action="set-spin-round-view"]');
    if (roundTab) {
      const round = parseRound(roundTab.dataset.round);
      if (round) {
        Actions.setSpinRoundView(round);
      }
      return;
    }

    const locked = getActionTarget(event, root, '[data-action="spin-round-locked"]');
    if (locked) {
      const round = parseRound(locked.dataset.round);
      if (round === 2 || round === 3) {
        Actions.notifySpinRoundLocked(round);
      }
      return;
    }

    if (getActionTarget(event, root, '[data-action="spin"]')) {
      Actions.spin();
      return;
    }

    const sourceBtn = getActionTarget(event, root, '[data-action="match-round3-source"]');
    if (sourceBtn?.dataset.mode === 'bank' || sourceBtn?.dataset.mode === 'category') {
      Actions.setMatchRound3SourceMode(sourceBtn.dataset.mode);
      return;
    }

    const categoryBtn = getActionTarget(event, root, '[data-action="match-round3-category"]');
    if (categoryBtn?.dataset.categoryId) {
      Actions.setMatchRound3Category(categoryBtn.dataset.categoryId);
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
