const TOAST_HTML = (message: string) =>
  `<div class="toast" role="status" aria-live="polite">${message}</div>`;

export function syncToastDom(message: string, host: HTMLElement | null): void {
  if (!host) {
    return;
  }

  host.innerHTML = message ? TOAST_HTML(message) : '';
}
