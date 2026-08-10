import { appContext } from '../state';
import { syncSpinUi } from '../../utils/sync-spin-ui';
import { showToast } from './shared';
import { startMatchActivePlay } from './match-play-actions';
import { startRound1FromCategory } from './spin-actions';

export function closeModal(): void {
  appContext.setRuntimeState({ modal: null });
  syncSpinUi();
}

/** MC xác nhận sau thông báo kết quả quay → vào phần thi. */
export function confirmSpinResult(): void {
  const modal = appContext.getRuntimeState().modal;
  if (!modal || modal.kind !== 'spin-result') {
    return;
  }

  const { round, categoryId, packId, color, label } = modal;
  closeModal();

  if (round === 1 && categoryId) {
    const category = appContext.getAppState().categories.find((item) => item.id === categoryId);
    if (!category) {
      showToast('Không tìm thấy lĩnh vực đã quay');
      return;
    }
    startRound1FromCategory(category);
    return;
  }

  if (round === 2 && packId) {
    const session = appContext.getRuntimeState().matchSession;
    const pack = session?.round2Packs.find((item) => item.id === packId);
    if (!session || !pack) {
      showToast('Không tìm thấy bộ đề đã quay');
      return;
    }
    startMatchActivePlay({
      round: 2,
      questionIds: pack.questionIds,
      label,
      accentColor: color,
      existingSession: session,
    });
  }
}
