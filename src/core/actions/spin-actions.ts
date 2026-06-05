import { buildWheelModel } from '../wheel';
import { appContext } from '../state';
import { spinSession } from '../spin-session';
import { openGiftModal, openNoticeModal, openQuestionModal } from './modal-actions';
import { showToast } from './shared';
import type { WheelSegment } from '../../types';

function hasRewardItems(): boolean {
  const appState = appContext.getAppState();
  return appState.settings.gifts.length > 0 && appState.settings.punishments.length > 0;
}

function resolveSegmentAction(segment: WheelSegment): void {
  if (segment.kind === 'category' && segment.categoryId) {
    const category = appContext.getAppState().categories.find((item) => item.id === segment.categoryId);
    if (category) {
      openQuestionModal(category);
    }
    return;
  }

  if (segment.kind === 'gift') {
    openGiftModal('gift');
    return;
  }

  if (segment.kind === 'punishment') {
    openGiftModal('punishment');
    return;
  }

  if (segment.kind === 'extraTurn') {
    openNoticeModal('Bạn được thêm 1 lượt!', 'extraTurn');
    return;
  }

  openNoticeModal('Mất lượt!', 'loseTurn');
}

export function spin(): void {
  const runtime = appContext.getRuntimeState();
  const appState = appContext.getAppState();

  if (runtime.spinning || runtime.modal) {
    return;
  }

  if (!hasRewardItems()) {
    showToast('Hãy thêm ít nhất một Quà tặng và một Hình phạt trước khi quay');
    return;
  }

  const model = buildWheelModel(appState);
  if (!model.segments.length) {
    showToast('Chưa có dữ liệu để quay');
    return;
  }

  const chosen = model.segments[Math.floor(Math.random() * model.segments.length)];

  spinSession.cancel();
  appContext.setRuntimeState({ spinning: true, rotation: runtime.rotation });

  spinSession.start(model, chosen, runtime.rotation, {
    onComplete: ({ segment }) => resolveSegmentAction(segment),
  });
}
