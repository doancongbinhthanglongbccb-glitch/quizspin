import { appContext } from '../../core/state';
import * as Actions from '../../core/actions';
import { findQuestionById, isMcqOptionSelected } from '../../data';
import { syncQuizQuestionGrid } from '../../utils/quiz-timer-dom';

function getActionTarget(event: Event, root: ParentNode, selector: string): HTMLElement | null {
  const target = event.target instanceof Element ? event.target.closest<HTMLElement>(selector) : null;
  return target && root.contains(target) ? target : null;
}

function syncMcqFromState(root: ParentNode): void {
  const session = appContext.getRuntimeState().quizSession;
  if (!session || session.phase !== 'active') {
    return;
  }

  const questionId = session.questionIds[session.currentIndex];
  if (!questionId) {
    return;
  }

  const appState = appContext.getAppState();
  const question = findQuestionById(appState.categories, questionId);
  if (!question) {
    return;
  }

  const playerAnswer = session.answers[questionId] ?? '';

  root.querySelectorAll<HTMLElement>('[data-action="quiz-choose"]').forEach((button) => {
    const answer = button.dataset.answer;
    if (!answer) {
      return;
    }
    const decoded = decodeURIComponent(answer);
    const isSelected = isMcqOptionSelected(playerAnswer, decoded, question);
    button.classList.toggle('quiz-option--selected', isSelected);
    button.setAttribute('aria-checked', isSelected ? 'true' : 'false');
  });
}

export function initQuizDom(root: ParentNode): void {
  const session = appContext.getRuntimeState().quizSession;
  if (!session) {
    return;
  }

  const answeredFlags = session.questionIds.map((id) => !!(session.answers[id] ?? '').trim());
  syncQuizQuestionGrid(root, session.currentIndex, answeredFlags);
  syncMcqFromState(root);
}

export function bindQuizHandlers(root: ParentNode): () => void {
  initQuizDom(root);

  const onClick = (event: Event): void => {
    const chooseBtn = getActionTarget(event, root, '[data-action="quiz-choose"]');
    if (chooseBtn) {
      const answer = chooseBtn.dataset.answer;
      if (answer) {
        Actions.chooseQuizAnswer(decodeURIComponent(answer));
        syncMcqFromState(root);
      }
      return;
    }

    const gotoBtn = getActionTarget(event, root, '[data-action="quiz-goto"]');
    if (gotoBtn) {
      const index = Number(gotoBtn.dataset.quizIndex);
      if (!Number.isNaN(index)) {
        const session = appContext.getRuntimeState().quizSession;
        if (session?.phase === 'result') {
          Actions.goToQuizReviewQuestion(index);
        } else {
          Actions.goToQuizQuestion(index);
        }
      }
      return;
    }

    if (getActionTarget(event, root, '[data-action="quiz-prev"]')) {
      const session = appContext.getRuntimeState().quizSession;
      if (session) {
        const fn = session.phase === 'result' ? Actions.goToQuizReviewQuestion : Actions.goToQuizQuestion;
        fn(session.currentIndex - 1);
      }
      return;
    }

    if (getActionTarget(event, root, '[data-action="quiz-next"]')) {
      const session = appContext.getRuntimeState().quizSession;
      if (session) {
        const fn = session.phase === 'result' ? Actions.goToQuizReviewQuestion : Actions.goToQuizQuestion;
        fn(session.currentIndex + 1);
      }
      return;
    }

    if (getActionTarget(event, root, '[data-action="quiz-submit"]')) {
      Actions.requestSubmitQuiz();
      return;
    }

    if (getActionTarget(event, root, '[data-action="quiz-close"]')) {
      Actions.closeQuizSession();
    }
  };

  const onInput = (event: Event): void => {
    const target = event.target instanceof HTMLTextAreaElement ? event.target : null;
    if (!target || !root.contains(target)) {
      return;
    }
    if (target.matches('[data-action="quiz-essay-input"]')) {
      Actions.updateQuizEssayAnswer(target.value);
    }
  };

  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);
  return () => {
    root.removeEventListener('click', onClick);
    root.removeEventListener('input', onInput);
  };
}
