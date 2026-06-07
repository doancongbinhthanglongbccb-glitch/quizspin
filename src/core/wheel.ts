import type { AppState, WheelSegment } from '../types';
import { buildWheelSegments } from '../data';
import { DEFAULTS } from '../config';
import { normalizeDeg } from '../utils/angles';

export type WheelLayoutSegment = WheelSegment & {
  index: number;
  startAngle: number;
  endAngle: number;
  centerAngle: number;
};

export type WheelModel = {
  segments: WheelLayoutSegment[];
  sliceDeg: number;
  pointerAngleDeg: number;
};

export type WheelSpinParams = {
  startRotationDeg: number;
  extraSpins?: number;
  pointerOffsetDeg?: number;
};

export type WheelLandingResult = {
  segment: WheelLayoutSegment | null;
  rotationDeg: number;
  normalizedRotationDeg: number;
  landingAngleDeg: number;
};

function isAngleWithinSegment(angleDeg: number, startAngleDeg: number, endAngleDeg: number): boolean {
  if (startAngleDeg < endAngleDeg) {
    return angleDeg >= startAngleDeg && angleDeg < endAngleDeg;
  }

  return angleDeg >= startAngleDeg || angleDeg < endAngleDeg;
}

function createWheelLayout(segments: WheelSegment[]): WheelLayoutSegment[] {
  const count = Math.max(segments.length, 1);
  const sliceDeg = 360 / count;

  return segments.map((segment, index) => {
    const startAngle = sliceDeg * index;
    const endAngle = sliceDeg * (index + 1);
    const centerAngle = startAngle + sliceDeg / 2;

    return {
      ...segment,
      index,
      startAngle,
      endAngle,
      centerAngle,
    };
  });
}

export function buildWheelModel(appState: AppState, pointerOffsetDeg = DEFAULTS.pointerOffsetDeg): WheelModel {
  const segments = createWheelLayout(buildWheelSegments(appState.categories));

  return {
    segments,
    sliceDeg: segments.length > 0 ? 360 / segments.length : 360,
    pointerAngleDeg: pointerOffsetDeg,
  };
}

function getCurrentPointerAngle(model: WheelModel, rotationDeg: number): number {
  const normalizedRotationDeg = normalizeDeg(rotationDeg);
  return normalizeDeg(model.pointerAngleDeg - normalizedRotationDeg);
}

/**
 * Góc trả về segment đang nằm dưới pointer.
 * Quy ước:
 * - wheel quay theo chiều kim đồng hồ
 * - Pointer cố định bên phải bánh xe (3h)
 * - rotationDeg là góc đang xoay của wheel element
 */
export function resolveWinningSegment(model: WheelModel, rotationDeg: number): WheelLandingResult {
  if (model.segments.length === 0) {
    return {
      segment: null,
      rotationDeg,
      normalizedRotationDeg: normalizeDeg(rotationDeg),
      landingAngleDeg: normalizeDeg(model.pointerAngleDeg),
    };
  }

  const normalizedRotationDeg = normalizeDeg(rotationDeg);
  const landingAngleDeg = getCurrentPointerAngle(model, normalizedRotationDeg);
  const segment = model.segments.find((item) => isAngleWithinSegment(landingAngleDeg, item.startAngle, item.endAngle)) ?? null;

  return {
    segment,
    rotationDeg,
    normalizedRotationDeg,
    landingAngleDeg,
  };
}

export function buildLandingRotation(model: WheelModel, targetSegmentId: string, params: WheelSpinParams): number {
  const target = model.segments.find((segment) => segment.id === targetSegmentId);
  if (!target) {
    return params.startRotationDeg;
  }

  const pointerOffsetDeg = params.pointerOffsetDeg ?? model.pointerAngleDeg;
  const extraSpins = params.extraSpins ?? DEFAULTS.spinFullTurns;

  const targetNormalizedRotation = normalizeDeg(pointerOffsetDeg - target.centerAngle);
  const currentNormalized = normalizeDeg(params.startRotationDeg);
  let deltaDeg = normalizeDeg(targetNormalizedRotation - currentNormalized);
  if (deltaDeg === 0) {
    deltaDeg = 360;
  }

  const extraSpinDeg = Math.max(0, extraSpins) * 360;
  return params.startRotationDeg + extraSpinDeg + deltaDeg;
}
