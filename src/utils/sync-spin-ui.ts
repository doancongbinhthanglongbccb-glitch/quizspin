import { appContext } from '../core/state';

/** Cập nhật nút quay / trạng thái / glow mà không rebuild shell */
export function syncSpinUi(): void {
  const runtime = appContext.getRuntimeState();
  const spinning = runtime.spinning;
  const modalOpen = Boolean(runtime.modal);
  const matchOpen = Boolean(runtime.matchSession);
  const categoryCount = appContext.getAppState().categories.length;
  const canSpin = categoryCount > 0;

  const spinButton = document.querySelector<HTMLButtonElement>('[data-action="spin"]');
  if (spinButton) {
    spinButton.disabled = spinning || modalOpen || matchOpen || !canSpin;
  }

  const matchSpinButton = document.querySelector<HTMLButtonElement>('[data-action="match-spin-round2"]');
  if (matchSpinButton) {
    matchSpinButton.disabled = spinning;
  }

  const statusEl = document.querySelector<HTMLElement>('.spin-stat__value.status-pill--live');
  if (statusEl) {
    statusEl.textContent = spinning
      ? 'Đang quay'
      : matchOpen
        ? 'Đang trong ván'
        : modalOpen
          ? 'Đang hiển thị kết quả'
          : 'Sẵn sàng';
  }

  document.querySelectorAll<HTMLElement>('[data-wheel-host]').forEach((wheelHost) => {
    wheelHost.classList.toggle('wheel-frame--spinning', spinning);
  });
}
