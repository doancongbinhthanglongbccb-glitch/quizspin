import { QUIZ_CONFIG } from '../config/quiz';
import { isAndroidApp } from '../utils/platform';
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
  const unitEl = document.querySelector<HTMLElement>('[data-match-timer-unit]');
  const ring = document.querySelector<HTMLElement>('[data-match-timer-ring]');
  const progress = document.querySelector<SVGCircleElement>('[data-match-timer-progress]');

  const display =
    remaining >= 60
      ? { value: `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`, unit: 'phút' }
      : { value: String(remaining), unit: 'giây' };

  if (valueEl) {
    valueEl.textContent = display.value;
  }
  if (unitEl) {
    unitEl.textContent = display.unit;
  }

  const dangerSec = Math.min(QUIZ_CONFIG.dangerThresholdSec, Math.max(3, Math.ceil(total * 0.25)));
  const warningSec = Math.min(QUIZ_CONFIG.warningThresholdSec, Math.max(dangerSec + 1, Math.ceil(total * 0.5)));
  const danger = remaining > 0 && remaining <= dangerSec;
  const warning = remaining > dangerSec && remaining <= warningSec;

  if (ring) {
    ring.classList.toggle('timer-ring--danger', danger);
    ring.classList.toggle('timer-ring--warning', warning && !danger);
    ring.setAttribute('aria-label', `Còn ${remaining} giây`);
  }

  if (progress && ring) {
    const circumference = Number(ring.dataset.timerCircumference ?? 0);
    if (circumference > 0) {
      const ratio = remaining / Math.max(1, total);
      progress.style.strokeDashoffset = String(circumference * (1 - ratio));
    }
  }
}

export function startMatchTimer(): void {
  stopMatchTimer();
  timerCancelled = false;

  const session = appContext.getRuntimeState().matchSession;
  const play = session?.activePlay;
  if (!session || !play || play.phase !== 'answering' || play.timerSec <= 0) {
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
    if (!latestSession || !latestPlay || latestPlay.phase !== 'answering') {
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
      const dangerSec = Math.min(
        QUIZ_CONFIG.dangerThresholdSec,
        Math.max(3, Math.ceil(latestPlay.timerSec * 0.25)),
      );
      if (remaining <= dangerSec) {
        soundManager.play('countdown');
      }
      appContext.patchRuntimeState({
        matchSession: {
          ...latestSession,
          activePlay: { ...latestPlay, remaining },
        },
      });
    }

    lastRemaining = remaining;
  };

  tick();
  timerHandle = window.setInterval(tick, POLL_MS);
}
