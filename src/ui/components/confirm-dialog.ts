import type { ConfirmDialog } from '../../types';
import { escapeHtml } from '../../utils/html';

function describeDialog(dialog: ConfirmDialog): { title: string; message: string; confirmLabel: string; danger: boolean } {
  if (dialog.kind === 'delete-question') {
    return {
      title: 'Xóa câu hỏi',
      message: 'Bạn có chắc muốn xóa câu hỏi này? Hành động không thể hoàn tác.',
      confirmLabel: 'Xóa câu hỏi',
      danger: true,
    };
  }

  if (dialog.kind === 'delete-category') {
    return {
      title: 'Xóa lĩnh vực',
      message: `Xóa toàn bộ ${dialog.questionCount} câu trong "${dialog.categoryName}"?`,
      confirmLabel: 'Xóa lĩnh vực',
      danger: true,
    };
  }

  if (dialog.step === 1) {
    return {
      title: 'Xóa toàn bộ dữ liệu',
      message: 'Bạn chắc chắn muốn xóa toàn bộ dữ liệu?',
      confirmLabel: 'Tiếp tục',
      danger: true,
    };
  }

  return {
    title: 'Xác nhận lần cuối',
    message: 'Hành động này không thể hoàn tác. Xác nhận xóa và khôi phục dữ liệu mẫu?',
    confirmLabel: 'Xóa sạch',
    danger: true,
  };
}

export function renderConfirmDialog(dialog: ConfirmDialog | null): string {
  if (!dialog) {
    return '';
  }

  const { title, message, confirmLabel, danger } = describeDialog(dialog);

  return `
    <div class="confirm-backdrop fixed inset-0 z-30 grid place-items-center p-4 animate-modal-backdrop-in bg-slate-950/80 backdrop-blur-[10px]" role="presentation">
      <section
        class="confirm-card w-full max-w-[420px] animate-modal-card-in rounded-[22px] border border-white/10 bg-panel-modal px-5 pb-[18px] pt-[22px] shadow-[0_24px_64px_rgba(0,0,0,0.5)] ${danger ? 'confirm-card--danger border-red-500/35' : ''}"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <h2 id="confirm-title" class="confirm-card__title m-0 mb-2.5 text-title font-extrabold">${escapeHtml(title)}</h2>
        <p id="confirm-message" class="confirm-card__message m-0 mb-[18px] leading-normal text-muted">${escapeHtml(message)}</p>
        <div class="confirm-card__actions flex flex-wrap justify-end gap-2.5">
          <button type="button" class="btn btn-ghost" data-action="cancel-confirm">Hủy</button>
          <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="accept-confirm">${escapeHtml(confirmLabel)}</button>
        </div>
      </section>
    </div>
  `;
}
