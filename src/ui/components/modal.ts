import type { RuntimeState } from '../../core/state';
import type { AppState } from '../../types';

export function renderModal(appState: AppState, runtime: RuntimeState): string {
  const modal = runtime.modal;
  if (!modal) {
    return '';
  }

  if (modal.kind === 'gift') {
    return `
      <div class="modal-backdrop fixed inset-0 z-20 grid place-items-center p-4 animate-modal-backdrop-in bg-slate-950/75 backdrop-blur-sm">
        <section class="modal-card modal-card--simple grid gap-[18px] text-center">
          <div class="modal-eyebrow text-ui uppercase tracking-[0.18em] text-muted">${modal.title}</div>
          <div class="modal-gift text-[clamp(1.4rem,4vw,2.7rem)] font-extrabold leading-tight text-muted">${modal.text}</div>
          <div class="modal-actions modal-actions--center flex flex-wrap justify-center">
            <button class="btn btn-primary" data-action="close-modal">Đóng</button>
          </div>
        </section>
      </div>
    `;
  }

  return `
    <div class="modal-backdrop fixed inset-0 z-20 grid place-items-center p-4 animate-modal-backdrop-in bg-slate-950/75 backdrop-blur-sm">
      <section class="modal-card modal-card--simple grid gap-[18px] text-center">
        <div class="modal-notice text-[clamp(1.4rem,4vw,2.7rem)] font-extrabold leading-tight text-muted">${modal.text}</div>
        <div class="modal-actions modal-actions--center flex flex-wrap justify-center">
          <button class="btn btn-primary" data-action="close-modal">Đóng</button>
        </div>
      </section>
    </div>
  `;
}
