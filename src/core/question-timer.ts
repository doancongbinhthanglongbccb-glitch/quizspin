import { soundManager } from './sound-manager';
import { appContext } from './state';
import { updateQuestionTimerDom } from '../utils/question-timer-dom';

const POLL_MS = 250;

let timerHandle: number | null = null;
let timerCancelled = false;

export function questionRemainingSeconds(deadlineAt: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((deadlineAt - now) / 1000));
}

export function stopQuestionTimer(): void {
  timerCancelled = true;

  if (timerHandle !== null) {
    window.clearInterval(timerHandle);
    timerHandle = null;
  }

  soundManager.stopCountdown();
}

function ensureQuestionDeadline(): number | null {
  const runtime = appContext.getRuntimeState();
  if (!runtime.modal || runtime.modal.kind !== 'question') {
    return null;
  }

  const modal = runtime.modal;
  if (modal.deadlineAt > 0) {
    return modal.deadlineAt;
  }

  const deadlineAt = Date.now() + modal.remaining * 1000;
  appContext.setRuntimeState({
    modal: { ...modal, deadlineAt },
  });
  return deadlineAt;
}

export function startQuestionTimer(): void {
  stopQuestionTimer();
  timerCancelled = false;

  const runtime = appContext.getRuntimeState();
  if (!runtime.modal || runtime.modal.kind !== 'question' || runtime.modal.paused || runtime.modal.revealed) {
    return;
  }

  const initialDeadline = ensureQuestionDeadline();
  if (!initialDeadline) {
    return;
  }

  let lastRemaining = questionRemainingSeconds(initialDeadline);
  updateQuestionTimerDom(lastRemaining);

  const tick = (): void => {
    if (timerCancelled) {
      return;
    }

    const latest = appContext.getRuntimeState();
    if (!latest.modal || latest.modal.kind !== 'question' || latest.modal.paused || latest.modal.revealed) {
      return;
    }

    const remaining = questionRemainingSeconds(latest.modal.deadlineAt);

    if (remaining <= 0) {
      if (lastRemaining > 0) {
        stopQuestionTimer();
        void import('./actions/modal-actions').then(({ handleQuestionTimeUp }) => {
          handleQuestionTimeUp();
        });
      }
      return;
    }

    updateQuestionTimerDom(remaining);

    if (remaining < lastRemaining) {
      soundManager.play('countdown');
      appContext.patchRuntimeState({
        modal: { ...latest.modal, remaining },
      });
    }

    lastRemaining = remaining;
  };

  tick();
  timerHandle = window.setInterval(tick, POLL_MS);
}
