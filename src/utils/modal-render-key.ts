import type { RuntimeState } from '../core/state';
import type { AppState } from '../types';

export function getModalRenderKey(_appState: AppState, runtime: RuntimeState): string {
  return runtime.modal ? 'modal' : '';
}
