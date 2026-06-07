import type { ConfirmDialog } from '../../types';
import { escapeHtml } from '../../utils/html';

type DialogMeta = {
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
  input?: { id: string; value: string; placeholder: string };
  extraActions?: Array<{ action: string; label: string; danger?: boolean }>;
};

function describeDialog(dialog: ConfirmDialog): DialogMeta {
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

  if (dialog.kind === 'add-category') {
    return {
      title: 'Thêm lĩnh vực',
      message: 'Nhập tên lĩnh vực mới:',
      confirmLabel: 'Thêm',
      danger: false,
      input: { id: 'confirm-name-input', value: '', placeholder: 'Tên lĩnh vực' },
    };
  }

  if (dialog.kind === 'rename-category') {
    return {
      title: 'Đổi tên lĩnh vực',
      message: 'Nhập tên mới:',
      confirmLabel: 'Lưu',
      danger: false,
      input: { id: 'confirm-name-input', value: dialog.categoryName, placeholder: 'Tên lĩnh vực' },
    };
  }

  if (dialog.kind === 'category-menu') {
    return {
      title: dialog.categoryName,
      message: 'Chọn thao tác cho lĩnh vực này:',
      confirmLabel: 'Đổi tên',
      danger: false,
      extraActions: [
        { action: 'confirm-delete-category', label: 'Xóa lĩnh vực', danger: true },
      ],
    };
  }

  if (dialog.kind === 'clear-all-data' && dialog.step === 1) {
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

  const meta = describeDialog(dialog);
  const inputField = meta.input
    ? `
      <label class="sr-only" for="${meta.input.id}">${escapeHtml(meta.input.placeholder)}</label>
      <input
        id="${meta.input.id}"
        type="text"
        class="input mt-2.5 w-full"
        value="${escapeHtml(meta.input.value)}"
        placeholder="${escapeHtml(meta.input.placeholder)}"
        autocomplete="off"
      />
    `
    : '';

  const extraButtons = (meta.extraActions ?? [])
    .map(
      (item) =>
        `<button type="button" class="btn ${item.danger ? 'btn-danger' : 'btn-ghost'}" data-action="${item.action}">${escapeHtml(item.label)}</button>`,
    )
    .join('');

  const primaryAction =
    dialog.kind === 'category-menu' ? 'confirm-rename-category' : 'accept-confirm';

  return `
    <div class="confirm-backdrop fixed inset-0 z-30 grid place-items-center p-4 animate-modal-backdrop-in bg-slate-950/80 backdrop-blur-[10px]" role="presentation">
      <section
        class="confirm-card w-full max-w-[420px] animate-modal-card-in rounded-[22px] border border-white/10 bg-panel-modal px-5 pb-[18px] pt-[22px] shadow-[0_24px_64px_rgba(0,0,0,0.5)] ${meta.danger ? 'confirm-card--danger border-red-500/35' : ''}"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <h2 id="confirm-title" class="confirm-card__title m-0 mb-2.5 text-title font-extrabold">${escapeHtml(meta.title)}</h2>
        <p id="confirm-message" class="confirm-card__message m-0 mb-[18px] leading-normal text-muted">${escapeHtml(meta.message)}</p>
        ${inputField}
        <div class="confirm-card__actions flex flex-wrap justify-end gap-2.5 ${inputField ? 'mt-3.5' : ''}">
          <button type="button" class="btn btn-ghost" data-action="cancel-confirm">Hủy</button>
          ${extraButtons}
          <button type="button" class="btn ${meta.danger ? 'btn-danger' : 'btn-primary'}" data-action="${primaryAction}">${escapeHtml(meta.confirmLabel)}</button>
        </div>
      </section>
    </div>
  `;
}
