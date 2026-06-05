import { DEFAULTS } from '../../config';
import { appContext } from '../state';
import { openGiftModal, openNoticeModal, openQuestionModal } from './modal-actions';
import { playTone, showToast } from './shared';
import { buildWheelModel } from '../wheel';
import { WheelRenderer } from '../../ui/components/wheel';
import { startSpinAnimation, type SpinAnimationController } from '../../utils/animate';

const WHEEL_CANVAS_ID = 'wheel-canvas';
const MIN_SPIN_DURATION_MS = 1500;
const TICK_SOUND_MIN_INTERVAL_MS = 90;
const TICK_SOUND_VELOCITY_THRESHOLD = 540;

let activeSpinAnimation: SpinAnimationController | null = null;

function hasRewardItems(): boolean {
  const appState = appContext.getAppState();
  return appState.settings.gifts.length > 0 && appState.settings.punishments.length > 0;
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
  let latestElapsedMs = 0;
  let lastTickSoundAtMs = -TICK_SOUND_MIN_INTERVAL_MS;

  activeSpinAnimation?.cancel();
  activeSpinAnimation = null;

  appContext.setRuntimeState({ spinning: true, rotation: runtime.rotation });
  playTone(160, 260, 'sawtooth');

  activeSpinAnimation = startSpinAnimation({
    model,
    fromRotationDeg: runtime.rotation,
    targetSegmentId: chosen.id,
    config: {
      extraSpins: DEFAULTS.spinFullTurns,
    },
    onFrame: ({ rotationDeg, velocityDegPerSec, elapsedMs }) => {
      latestElapsedMs = elapsedMs;

      if (velocityDegPerSec >= TICK_SOUND_VELOCITY_THRESHOLD && elapsedMs - lastTickSoundAtMs >= TICK_SOUND_MIN_INTERVAL_MS) {
        playTone(420, 20, 'square');
        lastTickSoundAtMs = elapsedMs;
      }

      WheelRenderer.draw(WHEEL_CANVAS_ID, model, rotationDeg);
    },
    onComplete: ({ landing, finalRotationDeg, canceled }) => {
      if (canceled) {
        return;
      }

      const finalize = (): void => {
        activeSpinAnimation = null;
        appContext.setRuntimeState({ spinning: false, rotation: finalRotationDeg % 360 });

        const segment = landing.segment ?? chosen;

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
          openNoticeModal('Bạn được thêm 1 lượt!');
          return;
        }

        openNoticeModal('Mất lượt!');
      };

      const remainingDelayMs = Math.max(0, MIN_SPIN_DURATION_MS - latestElapsedMs);
      if (remainingDelayMs > 0) {
        window.setTimeout(finalize, remainingDelayMs);
        return;
      }

      finalize();
    },
  });
}
