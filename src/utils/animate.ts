import type { WheelLandingResult, WheelModel } from '../core/wheel';
import { buildLandingRotation, resolveWinningSegment } from '../core/wheel';

export type SpinPhysicsConfig = {
  /**
   * Vận tốc góc ban đầu, đơn vị độ / giây.
   * Giá trị lớn hơn sẽ cho cảm giác quay mạnh hơn.
   */
  initialVelocityDegPerSec: number;

  /**
   * Hệ số ma sát theo frame, ví dụ 0.985 nghĩa là mỗi frame velocity giảm còn 98.5%.
   */
  frictionPerFrame: number;

  /**
   * Ngưỡng vận tốc thấp nhất để coi như đã dừng.
   */
  minVelocityDegPerSec: number;

  /**
   * Số vòng quay tối thiểu để đảm bảo wheel có đà trước khi chậm lại.
   */
  extraSpins: number;

  /**
   * Số mili giây dùng để snap mềm về đích ở cuối animation.
   */
  snapDurationMs: number;
};

export type SpinAnimationFrame = {
  rotationDeg: number;
  velocityDegPerSec: number;
  elapsedMs: number;
  progress: number;
};

export type SpinAnimationComplete = {
  landing: WheelLandingResult;
  finalRotationDeg: number;
  canceled: boolean;
};

export type StartSpinAnimationParams = {
  model: WheelModel;
  fromRotationDeg: number;
  onFrame: (frame: SpinAnimationFrame) => void;
  onComplete: (result: SpinAnimationComplete) => void;
  config?: Partial<SpinPhysicsConfig>;
  /**
   * Nếu truyền targetSegmentId, animation sẽ kết thúc bằng cách snap nhẹ vào segment đó.
   * Nếu không truyền, wheel sẽ dừng tự nhiên theo friction rồi resolve segment từ góc cuối.
   */
  targetSegmentId?: string;
  /**
   * Hàm nhận transform rotation hiện tại để cập nhật UI ngay trong animation loop.
   */
  applyRotation?: (rotationDeg: number) => void;
};

export type SpinAnimationController = {
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  isRunning: () => boolean;
  isPaused: () => boolean;
};

const DEFAULT_SPIN_PHYSICS: SpinPhysicsConfig = {
  initialVelocityDegPerSec: 1440,
  frictionPerFrame: 0.985,
  minVelocityDegPerSec: 12,
  extraSpins: 6,
  snapDurationMs: 220,
};

function normalizeDeg(angleDeg: number): number {
  const next = angleDeg % 360;
  return next < 0 ? next + 360 : next;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function easeOutCubic(value: number): number {
  const clamped = clamp(value, 0, 1);
  return 1 - Math.pow(1 - clamped, 3);
}

function resolvePhysicsConfig(config?: Partial<SpinPhysicsConfig>): SpinPhysicsConfig {
  return {
    ...DEFAULT_SPIN_PHYSICS,
    ...config,
  };
}

/**
 * Chạy animation quay wheel bằng requestAnimationFrame.
 *
 * Mô hình vật lý:
 * - velocity ban đầu cao để tạo cảm giác “phóng”
 * - mỗi frame velocity bị giảm theo friction
 * - khi velocity xuống thấp hơn ngưỡng, ta chuyển sang snap nhẹ về góc mục tiêu
 * - nếu không có targetSegmentId, kết quả cuối cùng được resolve từ góc hiện tại
 */
export function startSpinAnimation(params: StartSpinAnimationParams): SpinAnimationController {
  const physics = resolvePhysicsConfig(params.config);
  const state = {
    phase: 'spinning' as 'spinning' | 'snapping' | 'completed',
    rotationDeg: params.fromRotationDeg,
    velocityDegPerSec: physics.initialVelocityDegPerSec,
    frameId: null as number | null,
    startedAtMs: 0,
    lastFrameAtMs: 0,
    paused: false,
    canceled: false,
    completed: false,
    pauseStartedAtMs: 0,
    pausedTotalMs: 0,
    snapStartRotationDeg: 0,
    snapStartMs: 0,
    targetRotationDeg: params.targetSegmentId
      ? buildLandingRotation(params.model, params.targetSegmentId, {
          startRotationDeg: params.fromRotationDeg,
          extraSpins: physics.extraSpins,
          pointerOffsetDeg: params.model.pointerAngleDeg,
        })
      : null,
  };

  function emitFrame(elapsedMs: number, progress: number): void {
    params.onFrame({
      rotationDeg: state.rotationDeg,
      velocityDegPerSec: state.velocityDegPerSec,
      elapsedMs,
      progress,
    });

    if (params.applyRotation) {
      params.applyRotation(state.rotationDeg);
    }
  }

  function stopLoop(): void {
    if (state.frameId !== null) {
      window.cancelAnimationFrame(state.frameId);
      state.frameId = null;
    }
  }

  function finish(): void {
    if (state.completed) {
      return;
    }

    state.phase = 'completed';
    state.completed = true;
    stopLoop();

    const landing = resolveWinningSegment(params.model, state.rotationDeg);
    params.onComplete({
      landing,
      finalRotationDeg: state.rotationDeg,
      canceled: state.canceled,
    });
  }

  function advanceSpinning(nowMs: number, deltaSec: number): void {
    // Friction được tính theo deltaSec để ổn định hơn giữa các thiết bị / frame rate khác nhau.
    const frictionFactor = Math.pow(physics.frictionPerFrame, deltaSec * 60);
    state.velocityDegPerSec *= frictionFactor;
    state.rotationDeg += state.velocityDegPerSec * deltaSec;

    const elapsedMs = Math.max(0, nowMs - state.startedAtMs - state.pausedTotalMs);
    emitFrame(elapsedMs, 0);

    const isVelocityLow = Math.abs(state.velocityDegPerSec) <= physics.minVelocityDegPerSec;

    // Nếu có target segment, chuyển sang snapping để chốt chính xác góc đích.
    // Nếu không có target segment, dừng tự nhiên và resolve segment từ góc cuối.
    if (isVelocityLow) {
      if (state.targetRotationDeg !== null) {
        state.phase = 'snapping';
        state.snapStartRotationDeg = state.rotationDeg;
        state.snapStartMs = nowMs;
        state.velocityDegPerSec = 0;
        return;
      }

      state.phase = 'completed';
      finish();
    }
  }

  function advanceSnapping(nowMs: number): void {
    if (state.targetRotationDeg === null) {
      state.phase = 'completed';
      finish();
      return;
    }

    const snapElapsedMs = nowMs - state.snapStartMs;
    const snapProgress = clamp(snapElapsedMs / physics.snapDurationMs, 0, 1);
    const easedProgress = easeOutCubic(snapProgress);

    state.rotationDeg = lerp(state.snapStartRotationDeg, state.targetRotationDeg, easedProgress);
    state.velocityDegPerSec = 0;

    const totalElapsedMs = Math.max(0, nowMs - state.startedAtMs - state.pausedTotalMs);
    emitFrame(totalElapsedMs, snapProgress);

    if (snapProgress >= 1) {
      state.rotationDeg = state.targetRotationDeg;
      emitFrame(totalElapsedMs, 1);
      state.phase = 'completed';
      finish();
    }
  }

  function step(nowMs: number): void {
    if (state.canceled || state.completed) {
      stopLoop();
      return;
    }

    state.frameId = window.requestAnimationFrame(step);

    if (state.paused) {
      return;
    }

    if (!state.startedAtMs) {
      state.startedAtMs = nowMs;
      state.lastFrameAtMs = nowMs;
      state.snapStartMs = nowMs;
      emitFrame(0, 0);
      return;
    }

    const deltaMs = Math.max(0, nowMs - state.lastFrameAtMs);
    state.lastFrameAtMs = nowMs;
    const deltaSec = deltaMs / 1000;

    if (state.phase === 'spinning') {
      advanceSpinning(nowMs, deltaSec);
      return;
    }

    if (state.phase === 'snapping') {
      advanceSnapping(nowMs);
      return;
    }

    stopLoop();
  }

  state.frameId = window.requestAnimationFrame(step);

  return {
    pause: () => {
      if (state.completed || state.canceled || state.paused) {
        return;
      }
      state.paused = true;
      state.pauseStartedAtMs = performance.now();
    },
    resume: () => {
      if (state.completed || state.canceled || !state.paused) {
        return;
      }
      state.paused = false;
      state.pausedTotalMs += performance.now() - state.pauseStartedAtMs;
      state.lastFrameAtMs = performance.now();
    },
    cancel: () => {
      if (state.completed || state.canceled) {
        return;
      }
      state.canceled = true;
      stopLoop();
      finish();
    },
    isRunning: () => !state.completed && !state.canceled,
    isPaused: () => state.paused,
  };
}

export function getDefaultSpinPhysics(): SpinPhysicsConfig {
  return { ...DEFAULT_SPIN_PHYSICS };
}
