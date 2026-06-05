import { appContext } from '../../core/state';

const TAB_ORDER = ['spin', 'bank', 'settings'] as const;
type TabKey = (typeof TAB_ORDER)[number];

const SWIPE_MIN_PX = 56;
const SWIPE_MAX_VERTICAL_PX = 48;

function canSwipeNavigate(): boolean {
  const runtime = appContext.getRuntimeState();
  return !runtime.spinning && !runtime.modal;
}

function switchTabByDirection(direction: 1 | -1, onBeforeSwitch?: () => void): void {
  const runtime = appContext.getRuntimeState();
  const currentIndex = TAB_ORDER.indexOf(runtime.tab);
  if (currentIndex < 0) {
    return;
  }

  const nextIndex = currentIndex + direction;
  if (nextIndex < 0 || nextIndex >= TAB_ORDER.length) {
    return;
  }

  onBeforeSwitch?.();
  appContext.setRuntimeState({ tab: TAB_ORDER[nextIndex] });
}

export function bindSwipeHandlers(root: ParentNode, onBeforeSwitch?: () => void): () => void {
  let startX = 0;
  let startY = 0;
  let tracking = false;

  const onTouchStart = (event: TouchEvent): void => {
    if (!canSwipeNavigate() || event.touches.length !== 1) {
      tracking = false;
      return;
    }

    const target = event.target instanceof Element ? event.target.closest('input, textarea, select, button, a, .modal-backdrop, .wheel-canvas') : null;
    if (target && root.contains(target)) {
      tracking = false;
      return;
    }

    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
    tracking = true;
  };

  const onTouchEnd = (event: TouchEvent): void => {
    if (!tracking) {
      return;
    }

    tracking = false;
    const touch = event.changedTouches[0];
    if (!touch) {
      return;
    }

    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    if (Math.abs(deltaY) > SWIPE_MAX_VERTICAL_PX || Math.abs(deltaX) < SWIPE_MIN_PX) {
      return;
    }

    // Vuốt trái → tab tiếp theo, vuốt phải → tab trước
    switchTabByDirection(deltaX < 0 ? 1 : -1, onBeforeSwitch);
  };

  root.addEventListener('touchstart', onTouchStart, { passive: true });
  root.addEventListener('touchend', onTouchEnd, { passive: true });

  return () => {
    root.removeEventListener('touchstart', onTouchStart);
    root.removeEventListener('touchend', onTouchEnd);
  };
}
