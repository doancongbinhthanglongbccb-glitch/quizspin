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

  if (dialog.kind === 'clear-category-questions') {
    return {
      title: 'Xóa toàn bộ câu hỏi',
      message: `Xóa hết ${dialog.questionCount} câu trong lĩnh vực "${dialog.categoryName}"? Lĩnh vực vẫn giữ lại. Hành động không thể hoàn tác.`,
      confirmLabel: 'Xóa hết câu',
      danger: true,
    };
  }

  if (dialog.kind === 'import-backup') {
    return {
      title: 'Nhập backup',
      message: `Ghi đè toàn bộ dữ liệu hiện tại bằng backup (${dialog.categoryCount} lĩnh vực, ${dialog.questionCount} câu)? Âm thanh tùy chỉnh không nằm trong backup. Hành động không thể hoàn tác.`,
      confirmLabel: 'Nhập backup',
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

  if (dialog.kind === 'clear-used-questions') {
    return {
      title: 'Xóa lịch sử đã dùng',
      message: `Đặt lại ${dialog.usedCount} câu đã hỏi trong ngân hàng? Các ván sau sẽ lại bốc từ đầu. Không xóa nội dung câu hỏi.`,
      confirmLabel: 'Xóa đã dùng',
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
    <div class="confirm-backdrop animate-modal-backdrop-in" role="presentation">
      <section
        class="confirm-card animate-modal-card-in${meta.danger ? ' confirm-card--danger' : ''}"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <h2 id="confirm-title" class="confirm-card__title">${escapeHtml(meta.title)}</h2>
        <p id="confirm-message" class="confirm-card__message">${escapeHtml(meta.message)}</p>
        ${inputField}
        <div class="confirm-card__actions${meta.extraActions?.length ? ' confirm-card__actions--stack' : ''}${inputField ? ' confirm-card__actions--after-input' : ''}">
          <button type="button" class="btn btn-ghost" data-action="cancel-confirm">Hủy</button>
          ${extraButtons}
          <button type="button" class="btn ${meta.danger ? 'btn-danger' : 'btn-primary'}" data-action="${primaryAction}">${escapeHtml(meta.confirmLabel)}</button>
        </div>
      </section>
    </div>
  `;
}
