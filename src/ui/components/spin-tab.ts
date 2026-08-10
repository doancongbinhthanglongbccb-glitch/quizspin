import type { AppState } from '../../types';
import type { RuntimeState } from '../../core/state';
import { WheelRenderer } from './wheel';

export function renderSpinTab(appState: AppState, runtime: RuntimeState): string {
  const status = runtime.spinning
    ? 'Đang quay'
    : runtime.matchSession
      ? 'Đang trong ván'
      : runtime.modal
        ? 'Đang hiển thị kết quả'
        : 'Sẵn sàng';
  const totalQuestions = appState.categories.reduce(
    (count, category) => count + category.questions.length,
    0,
  );
  const categoryCount = appState.categories.length;

  const spinDisabled = runtime.spinning || runtime.modal || runtime.matchSession !== null || categoryCount === 0;

  return `
    <section class="panel panel--spin" data-swipe-zone="content">
      ${
        categoryCount === 0
          ? '<div class="warning-banner mb-4 rounded-[14px] border border-amber-300/30 bg-amber-300/10 px-4 py-3.5 text-amber-200">Hãy thêm ít nhất 1 lĩnh vực trong Ngân hàng trước khi quay.</div>'
          : ''
      }
      <div class="spin-page">
        <div class="spin-layout">
          <div class="spin-wheel-zone">
            ${WheelRenderer.renderHTML(runtime.spinning)}
          </div>

          <div class="spin-actions">
            <button class="btn btn-spin" data-action="spin" ${spinDisabled ? 'disabled' : ''} aria-label="Quay vòng quay ngay">
              Bắt đầu quay
            </button>
            <p class="spin-meta m-0 text-center text-caption text-muted">
              <span class="spin-meta__status">${status}</span>
              <span class="spin-meta__sep" aria-hidden="true">·</span>
              <span>${totalQuestions} câu</span>
              <span class="spin-meta__sep" aria-hidden="true">·</span>
              <span>${categoryCount} lĩnh vực</span>
            </p>
            <p class="spin-hint m-0 text-center text-caption text-subtle">Vuốt trái/phải để đổi tab</p>
          </div>
        </div>
      </div>
    </section>
  `;
}
