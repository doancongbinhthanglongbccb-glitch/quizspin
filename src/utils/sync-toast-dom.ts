const TOAST_HTML = (message: string) =>
  `<div class="toast fixed left-1/2 z-30 -translate-x-1/2 rounded-full border border-white/10 bg-gray-900/95 px-5 py-3 text-ui font-semibold shadow-xl bottom-[calc(96px+env(safe-area-inset-bottom,0px))] lg:landscape:bottom-6">${message}</div>`;

export function syncToastDom(message: string, host: HTMLElement | null): void {
  if (!host) {
    return;
  }

  host.innerHTML = message ? TOAST_HTML(message) : '';
}
