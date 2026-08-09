import { appContext } from '../state';
import { syncSpinUi } from '../../utils/sync-spin-ui';

export function closeModal(): void {
  appContext.setRuntimeState({ modal: null });
  syncSpinUi();
}
