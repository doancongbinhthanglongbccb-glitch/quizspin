const RESTORE_SELECTOR = '[data-scroll-restore]';

export type ScrollSnapshot = {
  windowY: number;
  containers: Map<string, number>;
};

export function captureScroll(root: ParentNode): ScrollSnapshot {
  const containers = new Map<string, number>();

  root.querySelectorAll<HTMLElement>(RESTORE_SELECTOR).forEach((element, index) => {
    const key = element.dataset.scrollRestore ?? `scroll-${index}`;
    containers.set(key, element.scrollTop);
  });

  return {
    windowY: window.scrollY,
    containers,
  };
}

export function restoreScroll(root: ParentNode, snapshot: ScrollSnapshot | null): void {
  if (!snapshot) {
    return;
  }

  window.scrollTo(0, snapshot.windowY);

  root.querySelectorAll<HTMLElement>(RESTORE_SELECTOR).forEach((element, index) => {
    const key = element.dataset.scrollRestore ?? `scroll-${index}`;
    const top = snapshot.containers.get(key);
    if (top !== undefined) {
      element.scrollTop = top;
    }
  });
}
