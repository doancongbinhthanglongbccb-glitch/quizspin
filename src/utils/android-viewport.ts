import { isAndroidApp } from './platform';

const KEYBOARD_OPEN_THRESHOLD_PX = 80;

/** Đồng bộ inset bàn phím ảo — WebView Android + layout overflow:hidden. */
export function initAndroidKeyboardInset(): void {
  if (!isAndroidApp()) {
    return;
  }

  const viewport = window.visualViewport;
  if (!viewport) {
    return;
  }

  const root = document.documentElement;

  const sync = (): void => {
    const inset = Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop));
    root.style.setProperty('--keyboard-inset', `${inset}px`);
    root.classList.toggle('keyboard-open', inset >= KEYBOARD_OPEN_THRESHOLD_PX);
  };

  viewport.addEventListener('resize', sync);
  viewport.addEventListener('scroll', sync);
  window.addEventListener('orientationchange', sync);
  sync();
}
