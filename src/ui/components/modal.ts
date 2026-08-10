import type { RuntimeState } from '../../core/state';
import type { AppState } from '../../types';
import { escapeHtml } from '../../utils/html';

export function renderModal(_appState: AppState, runtime: RuntimeState): string {
  const modal = runtime.modal;
  if (!modal) {
    return '';
  }

  if (modal.kind === 'spin-result') {
    return `
      <div class="modal-backdrop spin-result-backdrop fixed inset-0 z-[28] grid place-items-center p-4 animate-modal-backdrop-in bg-slate-950/80 backdrop-blur-[10px]" role="presentation">
        <section
          class="modal-card spin-result-card w-full max-w-[440px] text-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="spin-result-title"
        >
          <p class="spin-result-card__eyebrow m-0">${escapeHtml(modal.eyebrow)}</p>
          <h2
            id="spin-result-title"
            class="spin-result-card__title m-0 mt-3"
            style="--spin-result-color:${escapeHtml(modal.color)}"
          >${escapeHtml(modal.label)}</h2>
          <div class="spin-result-card__actions mt-6 flex justify-center">
            <button type="button" class="btn btn-primary" data-action="confirm-spin-result">
              Bắt đầu
            </button>
          </div>
        </section>
      </div>
    `;
  }

  return '';
}
