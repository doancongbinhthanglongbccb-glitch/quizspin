import { appContext } from '../core/state';

/** Góc quay thực tế đang vẽ — dùng khi animation spin chưa cập nhật runtime.rotation */
let liveRotationDeg: number | null = null;

export function setLiveWheelRotation(rotationDeg: number | null): void {
  liveRotationDeg = rotationDeg;
}

export function getWheelDisplayRotation(): number {
  if (liveRotationDeg !== null) {
    return liveRotationDeg;
  }
  return appContext.getRuntimeState().rotation;
}
