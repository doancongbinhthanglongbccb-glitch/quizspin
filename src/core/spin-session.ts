import { SPIN_CONFIG } from '../config/spin';
import { buildLandingRotation, type WheelModel } from './wheel';
import { appContext } from './state';
import { soundManager } from './sound-manager';
import { WheelRenderer } from '../ui/components/wheel';
import { startSpinAnimation, type SpinAnimationController } from '../utils/animate';
import type { WheelSegment } from '../types';

const WHEEL_CANVAS_ID = 'wheel-canvas';

type SpinAudioState = {
  started: boolean;
  ended: boolean;
};

export type SpinSessionResult = {
  segment: WheelSegment;
  rotationDeg: number;
};

export type SpinSessionCallbacks = {
  onComplete: (result: SpinSessionResult) => void;
};

function normalizeRotationDeg(angleDeg: number): number {
  const next = angleDeg % 360;
  return next < 0 ? next + 360 : next;
}

/**
 * Một phiên quay: animation canvas + âm thanh + finalize dùng chung elapsedMs từ rAF.
 * Kết quả luôn theo segment đã random (`chosen`) — khớp kim + lịch sử + modal.
 */
export class SpinSession {
  private animation: SpinAnimationController | null = null;
  private audio: SpinAudioState = { started: false, ended: false };
  private finalized = false;
  private model: WheelModel | null = null;

  start(
    model: WheelModel,
    chosen: WheelSegment,
    fromRotationDeg: number,
    callbacks: SpinSessionCallbacks,
  ): void {
    this.cancel();
    this.model = model;
    this.finalized = false;
    this.audio = { started: false, ended: false };

    const { durationMs, extraSpins } = SPIN_CONFIG;
    const landingRotationDeg = this.landingRotation(model, chosen.id, fromRotationDeg);

    this.animation = startSpinAnimation({
      model,
      fromRotationDeg,
      targetSegmentId: chosen.id,
      config: { extraSpins, durationMs },
      onFrame: ({ rotationDeg, elapsedMs }) => {
        this.syncAudio(elapsedMs);
        WheelRenderer.draw(WHEEL_CANVAS_ID, model, rotationDeg);
      },
      onComplete: ({ canceled }) => {
        if (canceled) {
          this.dispose();
          appContext.setRuntimeState({ spinning: false });
          return;
        }

        if (this.finalized) {
          return;
        }

        this.complete(chosen, landingRotationDeg, callbacks);
      },
    });
  }

  cancel(): void {
    this.animation?.cancel();
    this.animation = null;
    this.dispose();
  }

  private complete(
    segment: WheelSegment,
    rotationDeg: number,
    callbacks: SpinSessionCallbacks,
  ): void {
    if (this.finalized || !this.model) {
      return;
    }

    this.finalized = true;
    this.endAudio();
    this.animation = null;

    const normalized = normalizeRotationDeg(rotationDeg);
    WheelRenderer.draw(WHEEL_CANVAS_ID, this.model, normalized);

    appContext.setRuntimeState({
      spinning: false,
      rotation: normalized,
      spinHistory: [
        { label: segment.label, color: segment.color, ts: Date.now() },
        ...appContext.getRuntimeState().spinHistory,
      ].slice(0, 12),
    });

    callbacks.onComplete({ segment, rotationDeg: normalized });
  }

  private syncAudio(elapsedMs: number): void {
    const { durationMs } = SPIN_CONFIG;

    if (this.audio.ended) {
      return;
    }

    if (!this.audio.started) {
      this.audio.started = true;
      soundManager.playLoop('spinBed');
      soundManager.playLoop('spinStart');
    }

    if (elapsedMs >= durationMs) {
      this.endAudio();
    }
  }

  private endAudio(): void {
    if (this.audio.ended) {
      return;
    }

    this.audio.ended = true;
    soundManager.stopSpinSounds();
    soundManager.play('spinStop');
  }

  private dispose(): void {
    soundManager.stopSpinSounds();
    this.animation = null;
    this.model = null;
  }

  private landingRotation(model: WheelModel, segmentId: string, fromRotationDeg: number): number {
    return buildLandingRotation(model, segmentId, {
      startRotationDeg: fromRotationDeg,
      extraSpins: SPIN_CONFIG.extraSpins,
      pointerOffsetDeg: model.pointerAngleDeg,
    });
  }
}

export const spinSession = new SpinSession();
