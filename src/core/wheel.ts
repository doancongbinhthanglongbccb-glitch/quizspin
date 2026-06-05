import type { AppState, SpinKind, WheelSegment } from '../types';
import { buildWheelSegments } from '../data';
import { DEFAULTS } from '../config';

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

function normalizeDeg(angleDeg: number): number {
  const next = angleDeg % 360;
  return next < 0 ? next + 360 : next;
}

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

/**
 * Tính góc hiện tại đang nằm dưới pointer cố định.
 *
 * Quy ước vật lý:
 * - Pointer đứng yên ở một góc cố định.
 * - Wheel quay theo chiều kim đồng hồ.
 * - Khi wheel quay thêm `rotationDeg`, góc thực tế dưới pointer sẽ bị trừ đi tương ứng.
 */
export function getCurrentPointerAngle(model: WheelModel, rotationDeg: number): number {
  const normalizedRotationDeg = normalizeDeg(rotationDeg);
  return normalizeDeg(model.pointerAngleDeg - normalizedRotationDeg);
}

/**
 * Góc trả về segment đang nằm dưới pointer.
 * Quy ước:
 * - wheel quay theo chiều kim đồng hồ
 * - pointer cố định ở đỉnh bánh xe
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
  const currentRotation = normalizeDeg(params.startRotationDeg);

  // Cần đưa center của segment trùng với pointer.
  // Công thức:
  // landing = pointerOffset - centerAngle + k*360
  const targetLandingDeg = normalizeDeg(pointerOffsetDeg - target.centerAngle);
  const extraSpinDeg = Math.max(0, extraSpins) * 360;
  const nextRotation = params.startRotationDeg + extraSpinDeg + targetLandingDeg;

  // Giữ rotation tăng dần để animation physics dễ đọc hơn.
  return nextRotation >= params.startRotationDeg ? nextRotation : currentRotation + extraSpinDeg + targetLandingDeg;
}

export function getSegmentById(model: WheelModel, segmentId: string): WheelLayoutSegment | null {
  return model.segments.find((segment) => segment.id === segmentId) ?? null;
}

export function getSegmentByAngle(model: WheelModel, angleDeg: number): WheelLayoutSegment | null {
  const normalizedAngleDeg = normalizeDeg(angleDeg);

  return model.segments.find((segment) => isAngleWithinSegment(normalizedAngleDeg, segment.startAngle, segment.endAngle)) ?? null;
}

export function createWheelModelFromSegments(segments: WheelSegment[], pointerOffsetDeg = DEFAULTS.pointerOffsetDeg): WheelModel {
  const layoutSegments = createWheelLayout(segments);
  return {
    segments: layoutSegments,
    sliceDeg: layoutSegments.length > 0 ? 360 / layoutSegments.length : 360,
    pointerAngleDeg: pointerOffsetDeg,
  };
}

export function isGiftKind(kind: SpinKind): boolean {
  return kind === 'gift' || kind === 'punishment';
}
