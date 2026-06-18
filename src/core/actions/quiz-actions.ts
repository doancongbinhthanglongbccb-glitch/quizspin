import { appContext } from '../state';
import { soundManager } from '../sound-manager';
import { gradeQuizAnswers, findQuestionById, isMcqQuestion, toggleMcqPlayerSelection } from '../../data';
import { pickCategorySession, pickPracticeSession, resetCategoryPool } from '../pool-manager';
import type { Category, QuizSession } from '../../types';
import { showToast } from './shared';
import { startQuizTimer, stopQuizTimer, quizRemainingSeconds } from '../quiz-timer';
import { syncQuizProgressDom } from '../../utils/quiz-timer-dom';
import { syncSpinUi } from '../../utils/sync-spin-ui';

function createSessionBase(
  categoryId: string | null,
  categoryName: string,
  categoryColor: string,
  questionIds: string[],
  timerSec: number,
): QuizSession {
  const deadlineAt = Date.now() + timerSec * 1000;
  return {
    phase: 'active',
    categoryId,
    categoryName,
    categoryColor,
    questionIds,
    currentIndex: 0,
    answers: {},
    timerSec,
    deadlineAt,
    paused: false,
    remaining: timerSec,
  };
}

export function startCategoryQuiz(category: Category): void {
  const pools = appContext.getQuestionPools();
  const { questions, poolReset } = pickCategorySession(category, pools);

  if (!questions.length) {
    showToast(`Lĩnh vực ${category.name} đang trống`);
    return;
  }

  if (poolReset) {
    appContext.setQuestionPools((current) => resetCategoryPool(current, category.id));
  }

  const timerSec = appContext.getAppState().settings.timer;

  appContext.setRuntimeState({
    quizSession: createSessionBase(category.id, category.name, category.color, questions.map((q) => q.id), timerSec),
  });

  startQuizTimer();
}

export function startPracticeQuiz(): void {
  const appState = appContext.getAppState();
  const questions = pickPracticeSession(appState.categories);

  if (!questions.length) {
    showToast('Chưa có câu hỏi để thi thử');
    return;
  }

  const timerSec = appState.settings.timer;

  appContext.setRuntimeState({
    quizSession: createSessionBase(null, 'Thi thử', '#4895ef', questions.map((q) => q.id), timerSec),
  });

  startQuizTimer();
}

export function goToQuizQuestion(index: number): void {
  const session = appContext.getRuntimeState().quizSession;
  if (!session || session.phase !== 'active') {
    return;
  }

  const nextIndex = Math.max(0, Math.min(session.questionIds.length - 1, index));
  appContext.setRuntimeState({
    quizSession: { ...session, currentIndex: nextIndex },
  });
}

export function chooseQuizAnswer(option: string): void {
  const runtime = appContext.getRuntimeState();
  const session = runtime.quizSession;
  if (!session || session.phase !== 'active') {
    return;
  }

  const questionId = session.questionIds[session.currentIndex];
  if (!questionId) {
    return;
  }

  const appState = appContext.getAppState();
  const question = findQuestionById(appState.categories, questionId);

  if (!question || !isMcqQuestion(question)) {
    return;
  }

  const playerAnswer = session.answers[questionId] ?? '';
  const nextAnswer = toggleMcqPlayerSelection(playerAnswer, option, question);

  appContext.setRuntimeState({
    quizSession: {
      ...session,
      answers: { ...session.answers, [questionId]: nextAnswer },
    },
  });
}

export function updateQuizEssayAnswer(text: string): void {
  const session = appContext.getRuntimeState().quizSession;
  if (!session || session.phase !== 'active') {
    return;
  }

  const questionId = session.questionIds[session.currentIndex];
  if (!questionId) {
    return;
  }

  appContext.patchRuntimeStateWithoutRender({
    quizSession: {
      ...session,
      answers: { ...session.answers, [questionId]: text },
    },
  });

  const answeredCount = session.questionIds.filter((id) => {
    const value = id === questionId ? text : (session.answers[id] ?? '');
    return value.trim().length > 0;
  }).length;
  syncQuizProgressDom(answeredCount, session.questionIds.length);

  const gridItem = session.questionIds.indexOf(questionId);
  if (gridItem >= 0) {
    const wasAnswered = !!(session.answers[questionId] ?? '').trim();
    const isAnswered = !!text.trim();
    if (wasAnswered !== isAnswered) {
      document.querySelectorAll<HTMLElement>('[data-quiz-grid-item]').forEach((button, index) => {
        if (index === gridItem) {
          button.classList.toggle('quiz-grid__item--answered', isAnswered);
        }
      });
    }
  }
}

export function requestSubmitQuiz(): void {
  const session = appContext.getRuntimeState().quizSession;
  if (!session || session.phase !== 'active') {
    return;
  }

  appContext.setRuntimeState({
    confirmDialog: { kind: 'submit-quiz' },
  });
}

export function submitQuiz(): void {
  const runtime = appContext.getRuntimeState();
  const session = runtime.quizSession;
  if (!session || session.phase !== 'active') {
    return;
  }

  stopQuizTimer();
  soundManager.stopCountdown();

  const appState = appContext.getAppState();
  const graded = gradeQuizAnswers(appState.categories, session.questionIds, session.answers);

  // Sau khi nộp bài mới đánh dấu câu đã dùng vào pool (chỉ lĩnh vực)
  if (session.categoryId) {
    appContext.setQuestionPools((current) => {
      const used = [...(current[session.categoryId!] ?? [])];
      for (const id of session.questionIds) {
        if (!used.includes(id)) {
          used.push(id);
        }
      }
      return { ...current, [session.categoryId!]: used };
    });
  }

  const nextSession: QuizSession = {
    ...session,
    phase: 'result',
    paused: true,
    remaining: quizRemainingSeconds(session.deadlineAt),
    results: graded.results,
    correctCount: graded.correctCount,
    totalGradable: graded.totalGradable,
    earnedPoints: graded.earnedPoints,
    maxPoints: graded.maxPoints,
  };

  appContext.setRuntimeState({ quizSession: nextSession, confirmDialog: null });

  if (graded.correctCount === graded.totalGradable && graded.totalGradable > 0) {
    soundManager.play('fanfare');
  } else if (graded.correctCount > 0) {
    soundManager.play('correct');
  } else if (graded.totalGradable > 0) {
    soundManager.play('wrong');
  }

  showToast(`Kết quả: ${graded.correctCount}/${graded.totalGradable} câu đúng`);
}

export function handleQuizTimeUp(): void {
  const session = appContext.getRuntimeState().quizSession;
  if (!session || session.phase !== 'active') {
    return;
  }

  showToast('Hết giờ — tự động nộp bài');
  submitQuiz();
}

export function closeQuizSession(): void {
  stopQuizTimer();
  appContext.setRuntimeState({ quizSession: null });
  syncSpinUi();
}

export function goToQuizReviewQuestion(index: number): void {
  const session = appContext.getRuntimeState().quizSession;
  if (!session || session.phase !== 'result') {
    return;
  }

  const nextIndex = Math.max(0, Math.min(session.questionIds.length - 1, index));
  appContext.setRuntimeState({
    quizSession: { ...session, currentIndex: nextIndex },
  });
}
