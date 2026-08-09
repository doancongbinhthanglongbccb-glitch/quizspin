import * as Actions from '../../core/actions';

function getActionTarget(event: Event, root: ParentNode, selector: string): HTMLElement | null {
  const target = event.target instanceof Element ? event.target.closest<HTMLElement>(selector) : null;
  return target && root.contains(target) ? target : null;
}

export function bindMatchPlayHandlers(root: ParentNode): () => void {
  const onClick = (event: Event): void => {
    const packageBtn = getActionTarget(event, root, '[data-action="match-select-package"]');
    if (packageBtn) {
      const packageId = packageBtn.dataset.packageId;
      if (packageId) {
        Actions.selectMatchPackage(packageId);
      }
      return;
    }

    if (getActionTarget(event, root, '[data-action="match-apply-default-package"]')) {
      Actions.applyDefaultMatchPackage();
      return;
    }

    const mcqBtn = getActionTarget(event, root, '[data-action="match-choose-mcq"]');
    if (mcqBtn) {
      const answer = mcqBtn.dataset.answer;
      if (answer) {
        Actions.chooseMatchMcqAnswer(decodeURIComponent(answer));
      }
      return;
    }

    if (getActionTarget(event, root, '[data-action="match-reveal-essay"]')) {
      Actions.revealMatchEssayForJudging();
      return;
    }

    if (getActionTarget(event, root, '[data-action="match-confirm-mcq"]')) {
      Actions.confirmMatchMcqAnswer();
      return;
    }

    const judgeBtn = getActionTarget(event, root, '[data-action="match-judge-essay"]');
    if (judgeBtn) {
      Actions.judgeMatchEssay(judgeBtn.dataset.correct === '1');
      return;
    }

    if (getActionTarget(event, root, '[data-action="match-next-question"]')) {
      Actions.goToNextMatchQuestion();
      return;
    }

    if (getActionTarget(event, root, '[data-action="match-continue-round"]')) {
      Actions.continueAfterRoundSummary();
      return;
    }

    if (getActionTarget(event, root, '[data-action="match-close-session"]')) {
      Actions.closeMatchSession();
    }
  };

  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}
