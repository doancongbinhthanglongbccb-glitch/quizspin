import { Capacitor } from '@capacitor/core';

export function isAndroidApp(): boolean {
  return Capacitor.getPlatform() === 'android';
}

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/** WebView / mobile — giảm hiệu ứng GPU nặng (blur, filter, shadow canvas). */
export function prefersLiteEffects(): boolean {
  return isAndroidApp();
}

/** Giới hạn DPR canvas — Android fill-rate thấp hơn. */
export function getCanvasDevicePixelRatio(): number {
  const raw = window.devicePixelRatio || 1;
  if (isAndroidApp()) {
    return Math.min(raw, 1.5);
  }
  return raw;
}

/** Gắn class lên `<html>` để CSS tắt hiệu ứng nặng trên Android. */
export function initPlatformFlags(): void {
  if (isAndroidApp()) {
    document.documentElement.classList.add('platform-android', 'perf-lite');
  }
}
