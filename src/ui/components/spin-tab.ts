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
          ? '<div class="warning-banner mb-4 rounded-[18px] border border-amber-300/30 bg-amber-300/10 px-4 py-3.5 text-amber-200">Hãy thêm ít nhất 1 lĩnh vực trong Ngân hàng trước khi quay.</div>'
          : ''
      }
      <div class="spin-page">
        <div class="spin-layout">
          <div class="spin-wheel-zone">
            ${WheelRenderer.renderHTML(runtime.spinning)}
          </div>

          <div class="spin-actions">
            <button class="btn btn-spin" data-action="spin" ${spinDisabled ? 'disabled' : ''} aria-label="Quay vòng quay ngay">
              BẮT ĐẦU QUAY
            </button>
            <p class="spin-hint m-0 text-center text-caption text-muted">Vuốt trái/phải để đổi tab</p>
          </div>

          <aside class="spin-layout__side flex w-full min-w-0 flex-col justify-start" aria-label="Thông tin lượt quay">
            <div class="spin-layout__stats grid w-full min-w-0 gap-2.5">
              <div class="spin-stat grid gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5">
                <span class="spin-stat__label text-caption font-bold uppercase tracking-wider text-subtle">Trạng thái</span>
                <span class="status-pill status-pill--live spin-stat__value inline-flex w-fit">${status}</span>
              </div>
              <div class="spin-stat grid gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5">
                <span class="spin-stat__label text-caption font-bold uppercase tracking-wider text-subtle">Kho câu hỏi</span>
                <span class="mini-pill spin-stat__value flex items-center">${totalQuestions} câu</span>
              </div>
              <div class="spin-stat grid gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5">
                <span class="spin-stat__label text-caption font-bold uppercase tracking-wider text-subtle">Lĩnh vực</span>
                <span class="mini-pill spin-stat__value flex items-center">${categoryCount} mục</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  `;
}
