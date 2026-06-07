import { appContext } from '../core/state';

function rewardReady(): boolean {
  const settings = appContext.getAppState().settings;
  return settings.gifts.length > 0 && settings.punishments.length > 0;
}

/** Cập nhật nút quay / trạng thái / glow mà không rebuild shell */
export function syncSpinUi(): void {
  const runtime = appContext.getRuntimeState();
  const spinning = runtime.spinning;
  const modalOpen = Boolean(runtime.modal);
  const canSpin = rewardReady();

  const spinButton = document.querySelector<HTMLButtonElement>('[data-action="spin"]');
  if (spinButton) {
    spinButton.disabled = spinning || modalOpen || !canSpin;
  }

  const statusEl = document.querySelector<HTMLElement>('.spin-stat__value.status-pill--live');
  if (statusEl) {
    statusEl.textContent = spinning
      ? 'Đang quay'
      : modalOpen
        ? 'Đang hiển thị kết quả'
        : 'Sẵn sàng';
  }

  const wheelHost = document.querySelector<HTMLElement>('[data-wheel-host]');
  if (wheelHost) {
    wheelHost.classList.toggle('wheel-frame--spinning', spinning);
  }
}
