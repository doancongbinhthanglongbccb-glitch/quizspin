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
      <div class="modal-backdrop spin-result-backdrop animate-modal-backdrop-in" role="presentation">
        <section
          class="spin-result-card animate-modal-card-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="spin-result-title"
        >
          <p class="spin-result-card__eyebrow">${escapeHtml(modal.eyebrow)}</p>
          <h2
            id="spin-result-title"
            class="spin-result-card__title"
            style="--spin-result-color:${escapeHtml(modal.color)}"
          >${escapeHtml(modal.label)}</h2>
          <div class="spin-result-card__actions">
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
