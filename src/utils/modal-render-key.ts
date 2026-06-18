import type { RuntimeState } from '../core/state';
import type { AppState } from '../types';

export function getModalRenderKey(_appState: AppState, runtime: RuntimeState): string {
  const modal = runtime.modal;
  if (!modal) {
    return '';
  }

  if (modal.kind === 'gift') {
    return `gift|${modal.title}|${modal.text}`;
  }

  return `notice|${modal.text}`;
}
