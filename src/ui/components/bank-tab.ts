import type { RuntimeState } from '../../core/state';
import type { AppState, Question, QuestionFilter } from '../../types';
import { escapeAttr, escapeHtml } from '../../utils/html';
import { currentCategory } from '../../core/actions';
import {
  countQuestionsByType,
  filterQuestions,
  getQuestionOptions,
  isMcqQuestion,
  questionTypeIcon,
  questionTypeLabel,
} from '../../data';

function renderFilterPills(active: QuestionFilter, counts: { mcq: number; essay: number; total: number }): string {
  const pill = (filter: QuestionFilter, label: string, count: number) => `
    <button
      type="button"
      class="filter-pill ${active === filter ? 'filter-pill--active' : ''}"
      data-action="filter-questions"
      data-filter="${filter}"
    >
      ${label} <span class="filter-pill__count">${count}</span>
    </button>
  `;

  return `
    <div class="filter-strip" role="group" aria-label="Lọc theo loại câu hỏi">
      ${pill('all', 'Tất cả', counts.total)}
      ${pill('mcq', '🔤 MCQ', counts.mcq)}
      ${pill('essay', '📝 Essay', counts.essay)}
    </div>
  `;
}

function renderQuestionForm(runtime: RuntimeState): string {
  const draft = runtime.questionDraft;
  const isMcq = draft.type === 'mcq';

  return `
    <div class="card bank-form-card">
      <div class="card-title">${runtime.editingQuestionId ? 'Sửa câu hỏi' : 'Thêm câu hỏi mới'}</div>

      <label class="bank-form-label" for="question-type-input">Loại câu hỏi</label>
      <select id="question-type-input" class="input question-type-select" data-action="draft-type" aria-label="Loại câu hỏi">
        <option value="mcq" ${draft.type === 'mcq' ? 'selected' : ''}>🔤 Trắc nghiệm (MCQ)</option>
        <option value="essay" ${draft.type === 'essay' ? 'selected' : ''}>📝 Tự luận (Essay)</option>
      </select>

      <label class="bank-form-label" for="question-input">Câu hỏi</label>
      <textarea
        class="textarea"
        id="question-input"
        data-draft-field="question"
        placeholder="Nhập nội dung câu hỏi..."
      >${escapeHtml(draft.question)}</textarea>

      <div class="bank-field-mcq ${isMcq ? '' : 'bank-field-mcq--hidden'}">
        <label class="bank-form-label" for="options-input">Phương án (mỗi dòng hoặc cách nhau bởi ; ,)</label>
        <textarea
          class="textarea textarea--small"
          id="options-input"
          data-draft-field="options"
          placeholder="A. Đáp án 1&#10;B. Đáp án 2&#10;C. Đáp án 3&#10;D. Đáp án 4"
        >${escapeHtml(draft.options)}</textarea>
      </div>

      <label class="bank-form-label" for="answer-input">${isMcq ? 'Đáp án đúng' : 'Đáp án / Gợi ý chấm'}</label>
      <textarea
        class="textarea ${isMcq ? 'textarea--compact' : ''}"
        id="answer-input"
        data-draft-field="answer"
        placeholder="${isMcq ? 'VD: C. 100' : 'Nội dung đáp án chi tiết...'}"
      >${escapeHtml(draft.answer)}</textarea>

      <div class="row-actions">
        <button class="btn btn-primary" data-action="save-question">
          ${runtime.editingQuestionId ? 'Cập nhật câu' : '+ Thêm câu'}
        </button>
        ${runtime.editingQuestionId ? '<button class="btn btn-ghost" data-action="cancel-question-edit">Hủy sửa</button>' : ''}
      </div>
    </div>
  `;
}

function renderQuestionRow(runtime: RuntimeState, question: Question): string {
  const isActive = runtime.editingQuestionId === question.id;
  const typeIcon = questionTypeIcon(question.type);
  const typeLabel = questionTypeLabel(question.type);
  const optionCount = getQuestionOptions(question).length;
  const optionLabel = isMcqQuestion(question) ? `${optionCount} lựa chọn` : 'Không có phương án';

  return `
    <div class="question-row ${isActive ? 'question-row--active' : ''}">
      <div class="question-row__body">
        <span class="question-type-badge question-type-badge--${question.type}" title="${typeLabel}">${typeIcon}</span>
        <div>
          <div class="question-row__title">${question.question}</div>
          <div class="question-row__meta">${typeLabel} · ${optionLabel}${question.points ? ` · ${question.points}đ` : ''}</div>
        </div>
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

  const typeCounts = category ? countQuestionsByType(category.questions) : { mcq: 0, essay: 0, total: 0 };
  const filteredQuestions = category ? filterQuestions(category.questions, runtime.questionFilter) : [];
  const questions = filteredQuestions.map((question) => renderQuestionRow(runtime, question)).join('');
  const emptyMessage =
    runtime.questionFilter === 'all'
      ? 'Chưa có câu hỏi nào trong lĩnh vực này.'
      : `Không có câu ${runtime.questionFilter === 'mcq' ? 'trắc nghiệm' : 'tự luận'} trong lĩnh vực này.`;

  const importReport = runtime.importReport;
  const importSummary = importReport
    ? `
      <div class="import-report">
        <div class="card-title">Kết quả nhập Excel</div>
        <div class="import-report__summary">
          Imported: ${importReport.imported} (${importReport.stats.mcq} MCQ, ${importReport.stats.essay} Essay) · Skipped: ${importReport.skipped}
        </div>
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
    <section class="panel panel--bank">
      <div class="bank-layout">
        <aside class="bank-sidebar">
          <div class="bank-sidebar__title">Lĩnh vực</div>
          <div class="category-strip category-strip--sidebar">
            ${categoryPills}
            <button class="category-pill category-pill--add" data-action="add-category">+ Thêm lĩnh vực mới</button>
          </div>
        </aside>

        <div class="bank-main">
          <div class="category-strip category-strip--mobile">
            ${categoryPills}
            <button class="category-pill category-pill--add" data-action="add-category">+ Thêm lĩnh vực mới</button>
          </div>

          <div class="section-head">
            <div>
              <div class="eyebrow">Ngân hàng câu hỏi</div>
              <h2>${category?.name ?? 'Chưa có lĩnh vực'}</h2>
              <p>
                ${category ? `${typeCounts.total} câu (${typeCounts.mcq} MCQ · ${typeCounts.essay} Essay)` : 'Tạo một lĩnh vực để bắt đầu.'}
              </p>
            </div>
            <div class="section-head__actions">
              <button class="btn btn-ghost" data-action="rename-category" ${category ? '' : 'disabled'}>Đổi tên</button>
              <button class="btn btn-danger" data-action="delete-category" ${category ? '' : 'disabled'}>Xóa sạch mục này</button>
            </div>
          </div>

          <div class="bank-grid">
            ${renderQuestionForm(runtime)}

            <div class="card">
              <div class="card-title">Upload Excel</div>
              <input id="excel-input" class="file-input" type="file" accept=".xlsx,.xls" />
              <p class="muted">4 cột: Lĩnh vực | Câu hỏi | Options | Đáp án đúng. Options trống = tự luận. Hỗ trợ legacy 2–3 cột.</p>
            </div>
          </div>

          ${importSummary}

          ${category ? renderFilterPills(runtime.questionFilter, typeCounts) : ''}

          <div class="question-list">${questions || `<div class="empty-state">${emptyMessage}</div>`}</div>
        </div>
      </div>
    </section>
  `;
}
