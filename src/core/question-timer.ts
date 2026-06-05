import { soundManager } from './sound-manager';
import { appContext } from './state';
import { showToast } from './toast';

const TICK_MS = 1000;

let timerHandle: number | null = null;

export function stopQuestionTimer(): void {
  if (timerHandle !== null) {
    window.clearInterval(timerHandle);
    timerHandle = null;
  }
}

export function startQuestionTimer(): void {
  stopQuestionTimer();

  const runtime = appContext.getRuntimeState();
  if (!runtime.modal || runtime.modal.kind !== 'question') {
    return;
  }

  timerHandle = window.setInterval(() => {
    const latest = appContext.getRuntimeState();
    if (!latest.modal || latest.modal.kind !== 'question' || latest.modal.paused || latest.modal.revealed) {
      return;
    }

    const remaining = latest.modal.remaining - 1;
    const nextModal = { ...latest.modal, remaining: Math.max(0, remaining) };

    if (remaining <= 0) {
      nextModal.paused = true;
      appContext.setRuntimeState({ modal: nextModal });
      showToast('Hết giờ');
      stopQuestionTimer();
      return;
    }

    soundManager.play('countdown');
    appContext.setRuntimeState({ modal: nextModal });
  }, TICK_MS);
}
