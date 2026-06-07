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
    <div class="filter-strip flex w-full min-w-0 max-w-full flex-wrap gap-2" role="group" aria-label="Lọc theo loại câu hỏi">
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
    <div class="bank-form-card grid gap-2.5">
      <div class="flex items-center justify-between gap-2.5">
        <div class="text-subtitle font-bold text-slate-200">${runtime.editingQuestionId ? 'Sửa câu hỏi' : 'Thêm câu hỏi'}</div>
        <button type="button" class="btn btn-ghost btn--compact" data-action="cancel-question-edit" aria-label="Đóng form">✕</button>
      </div>

      <div class="bank-form-card__body grid gap-2.5">
        <div class="grid min-w-0 gap-2.5">
          <label class="bank-form-label" for="question-type-input">Loại câu hỏi</label>
          <select id="question-type-input" class="input question-type-select cursor-pointer" data-action="draft-type" aria-label="Loại câu hỏi">
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

        <div class="grid min-w-0 gap-2.5">
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

      <div class="row-actions bank-form-card__actions mt-1 flex gap-3">
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
    <div class="question-row flex min-w-0 max-w-full items-start justify-between gap-3 rounded-[14px] border border-white/[0.06] bg-white/[0.03] px-[18px] py-4 ${isActive ? 'question-row--active' : ''}">
      <div class="question-row__body flex min-w-0 flex-1 items-start gap-3">
        <span class="question-type-badge question-type-badge--${question.type}">${typeLabel}</span>
        <div class="min-w-0 flex-1">
          <div class="question-row__title mb-1 break-words text-subtitle font-bold leading-snug">${question.question}</div>
          <div class="question-row__meta text-caption text-muted">${optionLabel}${question.points ? ` · ${question.points}đ` : ''}</div>
        </div>
      </div>
      <div class="row-actions row-actions--inline flex shrink-0 flex-nowrap gap-2">
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
          <span class="category-dot h-2.5 w-2.5 shrink-0 rounded-full" style="background:${item.color}"></span>
          <span class="category-pill__label max-w-[12rem] truncate">${item.name}</span>
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
      <details class="import-report import-report--compact rounded-xl border border-accent-cyan/20 bg-accent-cyan/10 px-3 py-2.5 text-blue-100">
        <summary class="import-report__summary cursor-pointer text-caption font-bold">
          Nhập Excel: ${importReport.imported} câu · Bỏ qua ${importReport.skipped}
        </summary>
        ${
          importReport.diagnostics.length
            ? `<ul class="import-report__list mt-2 grid list-none gap-2 p-0">${importReport.diagnostics
                .map(
                  (item) => `
                  <li class="grid gap-1 rounded-[14px] bg-white/5 px-3 py-2.5">
                    <strong>Dòng ${item.rowNumber}:</strong> ${item.reason}
                    <span class="text-caption text-muted">${escapeHtml(item.rawData.join(' | ') || '—')}</span>
                  </li>
                `,
                )
                .join('')}</ul>`
            : ''
        }
      </details>
    `
    : '';

  return `
    <section class="panel panel--bank flex min-h-0 min-w-0 max-w-full flex-col gap-3 overflow-x-clip rounded-[20px] px-4 py-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.28)]">
      <div class="bank-toolbar flex flex-wrap items-center gap-2">
        <button class="btn btn-primary btn--compact" data-action="start-add-question" ${category ? '' : 'disabled'}>
          + Thêm câu
        </button>
        <label class="btn btn-ghost btn--compact bank-import-btn relative m-0 cursor-pointer">
          Nhập Excel
          <input id="excel-input" class="bank-import-btn__input" type="file" accept=".xlsx,.xls" aria-label="Nhập Excel" />
        </label>
      </div>

      <div class="bank-categories category-strip mb-0 w-full max-w-full min-w-0 touch-pan-x overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch]" data-scroll-restore="bank-categories" role="tablist" aria-label="Lĩnh vực">
        ${renderCategoryTabs(appState, category?.id)}
        <button type="button" class="category-pill category-pill--add" data-action="add-category" aria-label="Thêm lĩnh vực">+</button>
      </div>

      ${importSummary}

      ${category ? renderFilterPills(runtime.questionFilter, typeCounts) : ''}

      <div class="question-list grid min-h-0 flex-1 gap-2" data-scroll-restore="question-list">
        ${questions || `<div class="empty-state px-4 py-7 text-center text-ui text-subtle">${emptyMessage}</div>`}
      </div>

      ${showForm ? `<div class="bank-form-panel mt-1 border-t border-white/10 pt-3">${renderQuestionForm(runtime)}</div>` : ''}
    </section>
  `;
}
