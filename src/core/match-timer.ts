import { isAndroidApp } from '../utils/platform';
import {
  formatMatchTimerClock,
  matchTimerDangerSec,
  matchTimerRatio,
  matchTimerUrgency,
} from '../utils/match-timer-ui';
import { soundManager } from './sound-manager';
import { appContext } from './state';

const POLL_MS = isAndroidApp() ? 500 : 250;

let timerHandle: number | null = null;
let timerCancelled = false;

export function matchRemainingSeconds(deadlineAt: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((deadlineAt - now) / 1000));
}

export function stopMatchTimer(): void {
  timerCancelled = true;
  if (timerHandle !== null) {
    window.clearInterval(timerHandle);
    timerHandle = null;
  }
  soundManager.stopCountdown();
}

function updateMatchTimerDom(remaining: number, total: number): void {
  const valueEl = document.querySelector<HTMLElement>('[data-match-timer-value]');
  const timebar = document.querySelector<HTMLElement>('[data-match-timebar]');
  const fill = document.querySelector<HTMLElement>('[data-match-timebar-fill]');
  const pill = document.querySelector<HTMLElement>('[data-match-timer-pill]');

  if (valueEl) {
    valueEl.textContent = formatMatchTimerClock(remaining);
  }

  const urgency = matchTimerUrgency(remaining, total);
  const ratio = matchTimerRatio(remaining, total);

  if (fill) {
    fill.style.width = `${(ratio * 100).toFixed(2)}%`;
  }

  if (timebar) {
    timebar.classList.toggle('quiz-timebar--danger', urgency === 'danger');
    timebar.classList.toggle('quiz-timebar--warning', urgency === 'warning');
    timebar.setAttribute('aria-valuenow', String(remaining));
    timebar.setAttribute('aria-label', `Còn ${remaining} giây`);
  }

  if (pill) {
    pill.classList.toggle('quiz-meta__timer--danger', urgency === 'danger');
    pill.classList.toggle('quiz-meta__timer--warning', urgency === 'warning');
    pill.setAttribute('aria-label', `Còn ${remaining} giây`);
  }
}

export function startMatchTimer(): void {
  stopMatchTimer();
  timerCancelled = false;

  const session = appContext.getRuntimeState().matchSession;
  const play = session?.activePlay;
  if (!session || !play || play.timerSec <= 0) {
    return;
  }
  if (play.phase !== 'answering') {
    return;
  }

  let lastRemaining = matchRemainingSeconds(play.deadlineAt);
  updateMatchTimerDom(lastRemaining, play.timerSec);

  const tick = (): void => {
    if (timerCancelled) {
      return;
    }

    const latestSession = appContext.getRuntimeState().matchSession;
    const latestPlay = latestSession?.activePlay;
    if (
      !latestSession ||
      !latestPlay ||
      latestPlay.phase !== 'answering'
    ) {
      return;
    }

    const remaining = matchRemainingSeconds(latestPlay.deadlineAt);
    if (remaining <= 0) {
      if (lastRemaining > 0) {
        stopMatchTimer();
        void import('./actions/match-play-actions').then(({ handleMatchTimeUp }) => {
          handleMatchTimeUp();
        });
      }
      return;
    }

    updateMatchTimerDom(remaining, latestPlay.timerSec);

    if (remaining < lastRemaining) {
      if (remaining <= matchTimerDangerSec(latestPlay.timerSec)) {
        soundManager.play('countdown');
      }
      // Đọc lại session mới nhất — tránh patch bằng snapshot cũ làm mất usedQuestionIds.
      const liveSession = appContext.getRuntimeState().matchSession;
      const livePlay = liveSession?.activePlay;
      if (
        !liveSession ||
        !livePlay ||
        livePlay.phase !== 'answering'
      ) {
        return;
      }
      appContext.patchRuntimeState({
        matchSession: {
          ...liveSession,
          activePlay: { ...livePlay, remaining },
        },
      });
    }

    lastRemaining = remaining;
  };

  tick();
  timerHandle = window.setInterval(tick, POLL_MS);
}
