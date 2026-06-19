import { QUIZ_CONFIG, isUnlimitedQuizTimer } from '../config/quiz';
import { isAndroidApp } from '../utils/platform';
import { soundManager } from './sound-manager';
import { appContext } from './state';
import { updateQuizTimerDom } from '../utils/quiz-timer-dom';

const POLL_MS = isAndroidApp() ? 500 : 250;

let timerHandle: number | null = null;
let timerCancelled = false;

export function quizRemainingSeconds(deadlineAt: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((deadlineAt - now) / 1000));
}

export function stopQuizTimer(): void {
  timerCancelled = true;

  if (timerHandle !== null) {
    window.clearInterval(timerHandle);
    timerHandle = null;
  }

  soundManager.stopCountdown();
}

function ensureQuizDeadline(): number | null {
  const session = appContext.getRuntimeState().quizSession;
  if (!session || session.phase !== 'active' || isUnlimitedQuizTimer(session.timerSec)) {
    return null;
  }

  if (session.deadlineAt > 0) {
    return session.deadlineAt;
  }

  const deadlineAt = Date.now() + session.remaining * 1000;
  appContext.patchRuntimeState({
    quizSession: { ...session, deadlineAt },
  });
  return deadlineAt;
}

export function startQuizTimer(): void {
  stopQuizTimer();
  timerCancelled = false;

  const session = appContext.getRuntimeState().quizSession;
  if (!session || session.phase !== 'active' || session.paused || isUnlimitedQuizTimer(session.timerSec)) {
    return;
  }

  const initialDeadline = ensureQuizDeadline();
  if (!initialDeadline) {
    return;
  }

  let lastRemaining = quizRemainingSeconds(initialDeadline);
  updateQuizTimerDom(lastRemaining, session.timerSec);

  const tick = (): void => {
    if (timerCancelled) {
      return;
    }

    const latest = appContext.getRuntimeState().quizSession;
    if (!latest || latest.phase !== 'active' || latest.paused) {
      return;
    }

    const remaining = quizRemainingSeconds(latest.deadlineAt);

    if (remaining <= 0) {
      if (lastRemaining > 0) {
        stopQuizTimer();
        void import('./actions/quiz-actions').then(({ handleQuizTimeUp }) => {
          handleQuizTimeUp();
        });
      }
      return;
    }

    updateQuizTimerDom(remaining, latest.timerSec);

    if (remaining < lastRemaining) {
      if (remaining <= QUIZ_CONFIG.dangerThresholdSec) {
        soundManager.play('countdown');
      }
      appContext.patchRuntimeState({
        quizSession: { ...latest, remaining },
      });
    }

    lastRemaining = remaining;
  };

  tick();
  timerHandle = window.setInterval(tick, POLL_MS);
}
