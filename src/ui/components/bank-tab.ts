import type { AppState, RuntimeState } from '../../core/state';
import { currentCategory } from '../../core/actions';

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replaceAll("'", '&#39;');
}

function renderQuestionRow(runtime: RuntimeState, question: { id: string; question: string; options: string[]; answer: string }): string {
  const isEditing = runtime.editingQuestionId === question.id;
  const optionLabel = question.options.length ? `${question.options.length} lựa chọn` : 'Tự luận';

  if (isEditing) {
    return `
      <div class="question-row question-row--editing">
        <input class="input" data-field="edit-question" data-id="${question.id}" value="${escapeAttr(question.question)}" />
        <input class="input" data-field="edit-answer" data-id="${question.id}" value="${escapeAttr(question.answer)}" />
        <textarea class="textarea textarea--small" data-field="edit-options" data-id="${question.id}">${escapeHtml(question.options.join('\n'))}</textarea>
        <div class="row-actions">
          <button class="btn btn-primary" data-action="save-question-edit" data-id="${question.id}">Lưu</button>
          <button class="btn btn-ghost" data-action="cancel-question-edit">Hủy</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="question-row">
      <div>
        <div class="question-row__title">${question.question}</div>
        <div class="question-row__meta">${optionLabel}</div>
      </div>
      <div class="row-actions">
        <button class="btn btn-ghost" data-action="start-edit-question" data-id="${question.id}">Sửa</button>
        <button class="btn btn-danger" data-action="delete-question" data-id="${question.id}">Xóa</button>
      </div>
    </div>
  `;
}

export function renderBankTab(appState: AppState, runtime: RuntimeState): string {
  const category = currentCategory();
  const categoryPills = appState.categories
    .map(
      (item) => `
        <button class="category-pill ${item.id === category?.id ? 'category-pill--active' : ''}" data-action="select-category" data-id="${item.id}">
          <span class="category-dot" style="background:${item.color}"></span>${item.name}
        </button>
      `,
    )
    .join('');

  const questions = category?.questions.map((question) => renderQuestionRow(runtime, question)).join('') ?? '';
  const importReport = runtime.importReport;

  const importSummary = importReport
    ? `
      <div class="import-report">
        <div class="card-title">Kết quả nhập Excel</div>
        <div class="import-report__summary">Imported: ${importReport.imported} questions · Skipped: ${importReport.skipped} rows</div>
        ${importReport.diagnostics.length
          ? `<ul class="import-report__list">${importReport.diagnostics
              .map(
                (item) => `
                  <li>
                    <strong>Row ${item.rowNumber}:</strong> ${item.reason}
                    <span>${escapeHtml(item.rawData.join(' | ') || '—')}</span>
                  </li>
                `,
              )
              .join('')}</ul>`
          : '<div class="muted">Không có dòng bị bỏ qua.</div>'}
      </div>
    `
    : '';

  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <div class="eyebrow">Ngân hàng câu hỏi</div>
          <h2>${category?.name ?? 'Chưa có lĩnh vực'}</h2>
          <p>${category ? `${category.questions.length} câu trong kho` : 'Tạo một lĩnh vực để bắt đầu.'}</p>
        </div>
        <div class="section-head__actions">
          <button class="btn btn-ghost" data-action="rename-category" ${category ? '' : 'disabled'}>Đổi tên</button>
          <button class="btn btn-danger" data-action="delete-category" ${category ? '' : 'disabled'}>Xóa sạch mục này</button>
        </div>
      </div>

      <div class="category-strip">
        ${categoryPills}
        <button class="category-pill category-pill--add" data-action="add-category">+ Thêm lĩnh vực mới</button>
      </div>

      <div class="bank-grid">
        <div class="card">
          <div class="card-title">Nhập tay</div>
          <textarea class="textarea" id="question-input" placeholder="Câu hỏi">${escapeHtml(runtime.questionDraft.question)}</textarea>
          <textarea class="textarea textarea--small" id="options-input" placeholder="4 lựa chọn, mỗi dòng 1 đáp án">${escapeHtml(runtime.questionDraft.options)}</textarea>
          <input class="input" id="answer-input" placeholder="Đáp án" value="${escapeAttr(runtime.questionDraft.answer)}" />
          <div class="row-actions">
            <button class="btn btn-primary" data-action="save-question">+ Thêm câu</button>
          </div>
        </div>

        <div class="card">
          <div class="card-title">Upload Excel</div>
          <input id="excel-input" class="file-input" type="file" accept=".xlsx,.xls" />
          <p class="muted">Hỗ trợ 2 hoặc 3 cột, ưu tiên format hybrid A/B/C như bản thiết kế.</p>
        </div>
      </div>

      ${importSummary}

      <div class="question-list">${questions || '<div class="empty-state">Chưa có câu hỏi nào trong lĩnh vực này.</div>'}</div>
    </section>
  `;
}
