import { appContext } from '../../core/state';

const TAB_ORDER = ['spin', 'bank', 'settings'] as const;

const SWIPE_MIN_PX = 56;
const SWIPE_MAX_VERTICAL_PX = 48;
const SCROLL_INTENT_PX = 10;

const BLOCK_SWIPE_SELECTOR =
  'input, textarea, select, button, a, .modal-backdrop, .wheel-canvas, [data-scroll-restore], .history-list--scroll, .question-list, .bank-sidebar, .category-strip, .modal-card, .spin-layout__side';

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
  let scrollIntent = false;
  let onTouchMove: ((event: Event) => void) | null = null;

  const clearTouchMove = (): void => {
    if (onTouchMove) {
      root.removeEventListener('touchmove', onTouchMove);
      onTouchMove = null;
    }
  };

  const onTouchStart = (event: Event): void => {
    clearTouchMove();
    scrollIntent = false;

    if (!(event instanceof TouchEvent) || !canSwipeNavigate() || event.touches.length !== 1) {
      tracking = false;
      return;
    }

    const target = event.target instanceof Element ? event.target.closest(BLOCK_SWIPE_SELECTOR) : null;
    if (target && root.contains(target)) {
      tracking = false;
      return;
    }

    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
    tracking = true;

    onTouchMove = (moveEvent: Event): void => {
      if (!(moveEvent instanceof TouchEvent) || !tracking || moveEvent.touches.length !== 1) {
        return;
      }

      const deltaX = moveEvent.touches[0].clientX - startX;
      const deltaY = moveEvent.touches[0].clientY - startY;

      if (Math.abs(deltaY) > SCROLL_INTENT_PX && Math.abs(deltaY) > Math.abs(deltaX)) {
        scrollIntent = true;
        tracking = false;
        clearTouchMove();
      }
    };

    root.addEventListener('touchmove', onTouchMove, { passive: true });
  };

  const onTouchEnd = (event: Event): void => {
    clearTouchMove();

    if (!(event instanceof TouchEvent) || !tracking || scrollIntent) {
      tracking = false;
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

    switchTabByDirection(deltaX < 0 ? 1 : -1, onBeforeSwitch);
  };

  root.addEventListener('touchstart', onTouchStart, { passive: true });
  root.addEventListener('touchend', onTouchEnd, { passive: true });
  root.addEventListener('touchcancel', onTouchEnd, { passive: true });

  return () => {
    clearTouchMove();
    root.removeEventListener('touchstart', onTouchStart);
    root.removeEventListener('touchend', onTouchEnd);
    root.removeEventListener('touchcancel', onTouchEnd);
  };
}
