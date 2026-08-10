import { appContext } from '../core/state';
import { countUsedQuestionsInBank } from '../core/pool-manager';

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

  const statusEl = document.querySelector<HTMLElement>('.spin-meta__status');
  if (statusEl) {
    statusEl.textContent = spinning
      ? 'Đang quay'
      : matchOpen
        ? 'Đang trong ván'
        : modalOpen
          ? 'Đang hiển thị kết quả'
          : 'Sẵn sàng';
  }

  const usedEl = document.querySelector<HTMLElement>('[data-match-used-progress]');
  if (usedEl) {
    const appState = appContext.getAppState();
    const used = countUsedQuestionsInBank(appContext.getQuestionPools(), appState.categories);
    const total = appState.categories.reduce((count, category) => count + category.questions.length, 0);
    const value = `${used}/${total}`;
    usedEl.dataset.matchUsedProgress = value;
    usedEl.textContent = `Đã dùng ${value}`;
  }

  document.querySelectorAll<HTMLElement>('[data-wheel-host]').forEach((wheelHost) => {
    wheelHost.classList.toggle('wheel-frame--spinning', spinning);
  });
}
