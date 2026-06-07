import type { WheelLandingResult, WheelModel } from '../core/wheel';
import { buildLandingRotation, resolveWinningSegment } from '../core/wheel';

export type SpinAnimationConfig = {
  durationMs: number;
  extraSpins: number;
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
  targetSegmentId: string;
  onFrame: (frame: SpinAnimationFrame) => void;
  onComplete: (result: SpinAnimationComplete) => void;
  config: SpinAnimationConfig;
  applyRotation?: (rotationDeg: number) => void;
};

export type SpinAnimationController = {
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  isRunning: () => boolean;
  isPaused: () => boolean;
};

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

/** Giữ chuyển động rõ đến ~90% thời gian, chốt nhẹ ở cuối */
function spinProgressEase(linearProgress: number): number {
  const progress = clamp(linearProgress, 0, 1);
  if (progress < 0.9) {
    return (progress / 0.9) * 0.94;
  }

  const tail = (progress - 0.9) / 0.1;
  return 0.94 + easeOutCubic(tail) * 0.06;
}

/**
 * Animation quay wheel theo thời gian cố định (ease-out) và chốt vào segment đích.
 */
export function startSpinAnimation(params: StartSpinAnimationParams): SpinAnimationController {
  const { durationMs, extraSpins } = params.config;
  const targetRotationDeg = buildLandingRotation(params.model, params.targetSegmentId, {
    startRotationDeg: params.fromRotationDeg,
    extraSpins,
    pointerOffsetDeg: params.model.pointerAngleDeg,
  });

  const state = {
    rotationDeg: params.fromRotationDeg,
    frameId: null as number | null,
    startedAtMs: 0,
    paused: false,
    canceled: false,
    completed: false,
    pauseStartedAtMs: 0,
    pausedTotalMs: 0,
  };

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

    state.completed = true;
    stopLoop();

    const landing = resolveWinningSegment(params.model, state.rotationDeg);
    params.onComplete({
      landing,
      finalRotationDeg: state.rotationDeg,
      canceled: state.canceled,
    });
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
      params.onFrame({
        rotationDeg: state.rotationDeg,
        velocityDegPerSec: 0,
        elapsedMs: 0,
        progress: 0,
      });
      if (params.applyRotation) {
        params.applyRotation(state.rotationDeg);
      }
      return;
    }

    const elapsedMs = Math.max(0, nowMs - state.startedAtMs - state.pausedTotalMs);
    const progress = clamp(elapsedMs / durationMs, 0, 1);
    const eased = spinProgressEase(progress);

    state.rotationDeg = lerp(params.fromRotationDeg, targetRotationDeg, eased);
    const velocityDegPerSec = (1 - progress) * 1800;

    params.onFrame({
      rotationDeg: state.rotationDeg,
      velocityDegPerSec,
      elapsedMs,
      progress,
    });

    if (params.applyRotation) {
      params.applyRotation(state.rotationDeg);
    }

    if (progress >= 1) {
      state.rotationDeg = targetRotationDeg;
      finish();
    }
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
