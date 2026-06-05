import { DEFAULTS } from '../../config';
import { soundManager } from '../sound-manager';
import { appContext } from '../state';

let timerHandle: number | null = null;
let toastHandle: number | null = null;
let spinHandle: number | null = null;

export function showToast(message: string): void {
  appContext.setRuntimeState({ toast: message });

  if (toastHandle) {
    window.clearTimeout(toastHandle);
  }

  toastHandle = window.setTimeout(() => {
    appContext.setRuntimeState({ toast: '' });
  }, DEFAULTS.toastDurationMs);
}

export function stopTimer(): void {
  if (timerHandle) {
    window.clearInterval(timerHandle);
    timerHandle = null;
  }
}

export function stopSpinTimeout(): void {
  if (spinHandle) {
    window.clearTimeout(spinHandle);
    spinHandle = null;
  }
}

export function setSpinTimeout(handle: number | null): void {
  stopSpinTimeout();
  spinHandle = handle;
}

export function setTimerHandle(handle: number | null): void {
  stopTimer();
  timerHandle = handle;
}

export function playTone(frequency: number, duration: number, type: OscillatorType = 'sine'): void {
  const appState = appContext.getAppState();
  if (!appState.settings.sound) {
    return;
  }

  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = 0.0001;
  oscillator.connect(gain);
  gain.connect(context.destination);

  const now = context.currentTime;
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration / 1000);
  oscillator.start();
  oscillator.stop(now + duration / 1000);
  oscillator.onended = () => context.close().catch(() => undefined);
}

export function startQuestionTimer(): void {
  stopTimer();
  const runtime = appContext.getRuntimeState();

  if (!runtime.modal || runtime.modal.kind !== 'question') {
    return;
  }

  const interval = window.setInterval(() => {
    const latestRuntime = appContext.getRuntimeState();
    if (!latestRuntime.modal || latestRuntime.modal.kind !== 'question' || latestRuntime.modal.paused || latestRuntime.modal.revealed) {
      return;
    }

    const remaining = latestRuntime.modal.remaining - 1;
    const nextModal = { ...latestRuntime.modal };
    nextModal.remaining = Math.max(0, remaining);

    if (remaining <= 0) {
      nextModal.paused = true;
      appContext.setRuntimeState({ modal: nextModal });
      soundManager.play('timeup');
      showToast('Hết giờ');
      stopTimer();
      return;
    }

    appContext.setRuntimeState({ modal: nextModal });
  }, 1000);

  setTimerHandle(interval);
}
