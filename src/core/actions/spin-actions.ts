import { buildWheelModel } from '../wheel';
import { appContext } from '../state';
import { spinSession } from '../spin-session';
import { syncSpinUi } from '../../utils/sync-spin-ui';
import { showToast } from './shared';
import type { WheelSegment } from '../../types';

function resolveSegmentAction(segment: WheelSegment): void {
  if (segment.kind === 'category' && segment.categoryId) {
    const category = appContext.getAppState().categories.find((item) => item.id === segment.categoryId);
    if (category) {
      // TODO(Phase 3): bắt đầu MatchSession Lượt 1 theo lĩnh vực
      showToast(`Đã chọn lĩnh vực: ${category.name}`);
    }
    return;
  }
}

export function spin(): void {
  const runtime = appContext.getRuntimeState();
  const appState = appContext.getAppState();

  if (runtime.spinning || runtime.modal || runtime.matchSession) {
    return;
  }

  const model = buildWheelModel(appState);
  if (!model.segments.length) {
    showToast('Chưa có dữ liệu để quay');
    return;
  }

  const chosen = model.segments[Math.floor(Math.random() * model.segments.length)];

  spinSession.cancel();
  appContext.patchRuntimeState({ spinning: true, rotation: runtime.rotation });
  syncSpinUi();

  spinSession.start(model, chosen, runtime.rotation, {
    onComplete: ({ segment }) => resolveSegmentAction(segment),
  });
}
