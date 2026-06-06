import type { RuntimeState } from '../../core/state';
import type { AppState, Question, QuestionFilter } from '../../types';
import { escapeHtml } from '../../utils/html';
import { currentCategory } from '../../core/actions';
import {
  countQuestionsByType,
  filterQuestions,
  getQuestionOptions,
  isMcqQuestion,
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
      ${pill('mcq', 'Trắc nghiệm', counts.mcq)}
      ${pill('essay', 'Tự luận', counts.essay)}
    </div>
  `;
}

function renderQuestionForm(runtime: RuntimeState): string {
  const draft = runtime.questionDraft;
  const isMcq = draft.type === 'mcq';

  return `
    <div class="bank-form-card">
      <div class="bank-form-card__head">
        <div class="bank-form-card__title">${runtime.editingQuestionId ? 'Sửa câu hỏi' : 'Thêm câu hỏi'}</div>
        <button type="button" class="btn btn-ghost btn--compact" data-action="cancel-question-edit" aria-label="Đóng form">✕</button>
      </div>

      <div class="bank-form-card__body">
        <div class="bank-form-card__primary">
          <label class="bank-form-label" for="question-type-input">Loại câu hỏi</label>
          <select id="question-type-input" class="input question-type-select" data-action="draft-type" aria-label="Loại câu hỏi">
            <option value="mcq" ${draft.type === 'mcq' ? 'selected' : ''}>Trắc nghiệm</option>
            <option value="essay" ${draft.type === 'essay' ? 'selected' : ''}>Tự luận</option>
          </select>

          <label class="bank-form-label" for="question-input">Câu hỏi</label>
          <textarea
            class="textarea textarea--compact"
            id="question-input"
            data-draft-field="question"
            placeholder="Nhập nội dung câu hỏi..."
          >${escapeHtml(draft.question)}</textarea>
        </div>

        <div class="bank-form-card__secondary">
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
            class="textarea textarea--compact"
            id="answer-input"
            data-draft-field="answer"
            placeholder="${isMcq ? 'VD: C. 100' : 'Nội dung đáp án chi tiết...'}"
          >${escapeHtml(draft.answer)}</textarea>
        </div>
      </div>

      <div class="row-actions bank-form-card__actions">
        <button class="btn btn-primary btn--compact" data-action="save-question">
          ${runtime.editingQuestionId ? 'Cập nhật' : 'Lưu câu'}
        </button>
        <button class="btn btn-ghost btn--compact" data-action="cancel-question-edit">Hủy</button>
      </div>
    </div>
  `;
}

function renderQuestionRow(runtime: RuntimeState, question: Question): string {
  const isActive = runtime.editingQuestionId === question.id;
  const typeLabel = questionTypeLabel(question.type);
  const optionCount = getQuestionOptions(question).length;
  const optionLabel = isMcqQuestion(question) ? `${optionCount} lựa chọn` : 'Tự luận';

  return `
    <div class="question-row ${isActive ? 'question-row--active' : ''}">
      <div class="question-row__body">
        <span class="question-type-badge question-type-badge--${question.type}">${typeLabel}</span>
        <div>
          <div class="question-row__title">${question.question}</div>
          <div class="question-row__meta">${optionLabel}${question.points ? ` · ${question.points}đ` : ''}</div>
        </div>
      </div>
      <div class="row-actions row-actions--inline">
        <button class="btn btn-ghost btn--compact" data-action="start-edit-question" data-id="${question.id}">Sửa</button>
        <button class="btn btn-danger btn--compact" data-action="delete-question" data-id="${question.id}">Xóa</button>
      </div>
    </div>
  `;
}

function renderCategoryTabs(appState: AppState, selectedId: string | undefined): string {
  return appState.categories
    .map((item) => {
      const active = item.id === selectedId;
      return `
        <button
          type="button"
          class="category-pill ${active ? 'category-pill--active' : ''}"
          data-action="select-category"
          data-id="${item.id}"
          role="tab"
          aria-selected="${active ? 'true' : 'false'}"
        >
          <span class="category-dot" style="background:${item.color}"></span>
          <span class="category-pill__label">${item.name}</span>
          <span class="category-pill__count">${item.questions.length}</span>
        </button>
      `;
    })
    .join('');
}

export function renderBankTab(appState: AppState, runtime: RuntimeState): string {
  const category = currentCategory();
  const typeCounts = category ? countQuestionsByType(category.questions) : { mcq: 0, essay: 0, total: 0 };
  const filteredQuestions = category ? filterQuestions(category.questions, runtime.questionFilter) : [];
  const questions = filteredQuestions.map((question) => renderQuestionRow(runtime, question)).join('');
  const emptyMessage =
    runtime.questionFilter === 'all'
      ? 'Chưa có câu hỏi nào trong lĩnh vực này.'
      : `Không có câu ${runtime.questionFilter === 'mcq' ? 'trắc nghiệm' : 'tự luận'} trong lĩnh vực này.`;

  const showForm = Boolean(category && (runtime.bankFormOpen || runtime.editingQuestionId));

  const importReport = runtime.importReport;
  const importSummary = importReport
    ? `
      <details class="import-report import-report--compact">
        <summary class="import-report__summary">
          Nhập Excel: ${importReport.imported} câu · Bỏ qua ${importReport.skipped}
        </summary>
        ${importReport.diagnostics.length
          ? `<ul class="import-report__list">${importReport.diagnostics
              .map(
                (item) => `
                  <li>
                    <strong>Dòng ${item.rowNumber}:</strong> ${item.reason}
                    <span>${escapeHtml(item.rawData.join(' | ') || '—')}</span>
                  </li>
                `,
              )
              .join('')}</ul>`
          : ''}
      </details>
    `
    : '';

  return `
    <section class="panel panel--bank">
      <div class="bank-toolbar">
        <button class="btn btn-primary btn--compact" data-action="start-add-question" ${category ? '' : 'disabled'}>
          + Thêm câu
        </button>
        <label class="btn btn-ghost btn--compact bank-import-btn">
          Nhập Excel
          <input id="excel-input" class="bank-import-btn__input" type="file" accept=".xlsx,.xls" aria-label="Nhập Excel" />
        </label>
      </div>

      <div class="bank-categories category-strip" data-scroll-restore="bank-categories" role="tablist" aria-label="Lĩnh vực">
        ${renderCategoryTabs(appState, category?.id)}
        <button type="button" class="category-pill category-pill--add" data-action="add-category" aria-label="Thêm lĩnh vực">+</button>
      </div>

      ${importSummary}

      ${category ? renderFilterPills(runtime.questionFilter, typeCounts) : ''}

      <div class="question-list" data-scroll-restore="question-list">
        ${questions || `<div class="empty-state">${emptyMessage}</div>`}
      </div>

      ${showForm ? `<div class="bank-form-panel">${renderQuestionForm(runtime)}</div>` : ''}
    </section>
  `;
}
