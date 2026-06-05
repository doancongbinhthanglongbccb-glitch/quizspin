import type { AppState } from '../../types';
import type { RuntimeState } from '../../core/state';
import { WheelRenderer } from './wheel';

export function renderSpinTab(appState: AppState, runtime: RuntimeState): string {
  const activeCategory = appState.categories[0];
  const status = runtime.spinning ? 'Đang quay' : runtime.modal ? 'Đang hiển thị câu hỏi' : 'Sẵn sàng';
  const rewardReady = appState.settings.gifts.length > 0 && appState.settings.punishments.length > 0;
  const recent = appState.categories
    .map((category) => `<li><span style="background:${category.color}"></span>${category.name} - ${category.questions.length} câu</li>`)
    .join('');

  return `
    <section class="panel panel--hero">
      ${rewardReady ? '' : '<div class="warning-banner">Hãy thêm ít nhất 1 Quà tặng và 1 Hình phạt trong Cài đặt trước khi quay.</div>'}
      <div class="spin-grid">
        <div class="spin-grid__wheel">
          ${WheelRenderer.renderHTML()}
          <div class="spin-grid__actions">
            <button class="btn btn-spin" data-action="spin" ${runtime.spinning || runtime.modal || !rewardReady ? 'disabled' : ''}>QUAY NGAY</button>
          </div>
        </div>
        <div class="stacked-card spin-grid__side">
          <div class="stacked-card__title">Trạng thái</div>
          <div class="status-pill">${status}</div>
          <div class="stacked-card__title">Lịch sử lĩnh vực</div>
          <ul class="history-list">${recent || '<li>Chưa có dữ liệu</li>'}</ul>
          <div class="stacked-card__title">Lượt hiện tại</div>
          <div class="current-player">${activeCategory?.name ?? 'Chưa có lĩnh vực'}</div>
        </div>
      </div>
    </section>
  `;
}
