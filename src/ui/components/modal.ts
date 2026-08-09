import type { RuntimeState } from '../../core/state';
import type { AppState } from '../../types';

export function renderModal(_appState: AppState, runtime: RuntimeState): string {
  if (!runtime.modal) {
    return '';
  }

  // Không còn kind ActiveModal active — slot chỉ còn null.
  return '';
}
