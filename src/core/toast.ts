import { DEFAULTS } from '../config';
import { syncToastDom } from '../utils/sync-toast-dom';
import { appContext } from './state';

let toastHandle: number | null = null;

function toastHost(): HTMLElement | null {
  return document.querySelector<HTMLElement>('#toast-host');
}

export function showToast(message: string): void {
  appContext.patchRuntimeState({ toast: message });
  syncToastDom(message, toastHost());

  if (toastHandle) {
    window.clearTimeout(toastHandle);
  }

  toastHandle = window.setTimeout(() => {
    appContext.patchRuntimeState({ toast: '' });
    syncToastDom('', toastHost());
  }, DEFAULTS.toastDurationMs);
}
