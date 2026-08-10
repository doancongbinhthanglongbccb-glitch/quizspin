import type { RuntimeState } from '../core/state';
import type { AppState } from '../types';

export function getModalRenderKey(_appState: AppState, runtime: RuntimeState): string {
  const modal = runtime.modal;
  if (!modal) {
    return '';
  }
  if (modal.kind === 'spin-result') {
    return `spin-result|${modal.round}|${modal.label}|${modal.categoryId ?? ''}|${modal.packId ?? ''}`;
  }
  return 'modal';
}
