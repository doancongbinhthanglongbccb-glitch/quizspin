import { DEFAULTS } from '../config';
import { appContext } from './state';

let toastHandle: number | null = null;

export function showToast(message: string): void {
  appContext.setRuntimeState({ toast: message });

  if (toastHandle) {
    window.clearTimeout(toastHandle);
  }

  toastHandle = window.setTimeout(() => {
    appContext.setRuntimeState({ toast: '' });
  }, DEFAULTS.toastDurationMs);
}
