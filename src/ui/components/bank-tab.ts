import type { RuntimeState } from '../../core/state';
import type { AppState, Question } from '../../types';
import { escapeHtml } from '../../utils/html';
import { currentCategory } from '../../core/actions';
import {
  getQuestionOptions,
  isMcqQuestion,
  isMultipleMcqQuestion,
} from '../../data';

function renderQuestionForm(runtime: RuntimeState): string {
  const draft = runtime.questionDraft;

  return `
    <div class="bank-form-card grid gap-2.5">
      <div class="flex items-center justify-between gap-2.5">
        <div class="text-subtitle font-bold text-slate-200">${runtime.editingQuestionId ? 'Sửa câu hỏi' : 'Thêm câu hỏi'}</div>
        <button type="button" class="btn btn-ghost btn--compact" data-action="cancel-question-edit" aria-label="Đóng form">✕</button>
      </div>

      <div class="bank-form-card__body grid gap-2.5">
        <div class="grid min-w-0 gap-2.5">
          <label class="bank-form-label" for="question-input">Câu hỏi</label>
          <textarea
            class="textarea textarea--compact"
            id="question-input"
            data-draft-field="question"
            placeholder="Nhập nội dung câu hỏi..."
          >${escapeHtml(draft.question)}</textarea>
        </div>

        <div class="grid min-w-0 gap-2.5">
          <div class="bank-field-mcq">
            <label class="bank-form-label" for="options-input">Phương án (mỗi dòng hoặc cách nhau bởi ; ,)</label>
            <textarea
              class="textarea textarea--small"
              id="options-input"
              data-draft-field="options"
              placeholder="A. Đáp án 1&#10;B. Đáp án 2&#10;C. Đáp án 3&#10;D. Đáp án 4"
            >${escapeHtml(draft.options)}</textarea>
          </div>

          <label class="bank-form-label" for="answer-input">Đáp án đúng</label>
          <textarea
            class="textarea textarea--compact"
            id="answer-input"
            data-draft-field="answer"
            placeholder="VD: C hoặc A, C (nhiều đáp án cách nhau bởi dấu phẩy)"
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
  const optionCount = getQuestionOptions(question).length;
  const optionLabel = `${optionCount} lựa chọn${isMultipleMcqQuestion(question) ? ' · nhiều đáp án' : ''}`;

  return `
    <div class="question-row flex min-w-0 max-w-full items-start justify-between gap-3 rounded-[14px] border border-white/[0.06] bg-white/[0.03] px-[18px] py-4 ${isActive ? 'question-row--active' : ''}">
      <div class="question-row__body flex min-w-0 flex-1 items-start gap-3">
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
      const mcqCount = item.questions.filter(isMcqQuestion).length;
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
          <span class="category-pill__count">${mcqCount}</span>
        </button>
      `;
    })
    .join('');
}

export function renderBankTab(appState: AppState, runtime: RuntimeState): string {
  const category = currentCategory();
  const mcqQuestions = category ? category.questions.filter(isMcqQuestion) : [];
  const questions = mcqQuestions.map((question) => renderQuestionRow(runtime, question)).join('');
  const emptyMessage = 'Chưa có câu hỏi nào trong lĩnh vực này.';

  const showForm = Boolean(category && (runtime.bankFormOpen || runtime.editingQuestionId));

  const importReport = runtime.importReport;
  const importSummary = importReport
    ? (() => {
        const failed = importReport.imported === 0;
        const reasonCounts = new Map<string, number>();
        for (const item of importReport.diagnostics) {
          reasonCounts.set(item.reason, (reasonCounts.get(item.reason) ?? 0) + 1);
        }
        const grouped = [...reasonCounts.entries()].sort((a, b) => b[1] - a[1]);
        const sampleRows = importReport.diagnostics.filter((item) => item.reason !== 'Dòng trống').slice(0, 15);
        const tone = failed
          ? 'border-rose-400/30 bg-rose-500/10 text-rose-100'
          : 'border-accent-cyan/20 bg-accent-cyan/10 text-blue-100';

        return `
      <details class="import-report import-report--compact rounded-xl border ${tone} px-3 py-2.5" ${failed ? 'open' : ''}>
        <summary class="import-report__summary cursor-pointer text-caption font-bold">
          ${
            failed
              ? `Không nhập được câu nào · Bỏ qua ${importReport.skipped} dòng`
              : `Nhập Excel: ${importReport.imported} câu · Bỏ qua ${importReport.skipped}`
          }
        </summary>
        <p class="mt-2 mb-0 text-caption text-muted">
          Định dạng cần có: <strong>Câu hỏi | Phương án | Đáp án đúng</strong> (mỗi phương án một dòng).
        </p>
        ${
          grouped.length
            ? `<ul class="import-report__list mt-2 grid list-none gap-1.5 p-0">${grouped
                .map(
                  ([reason, count]) => `
                  <li class="rounded-[10px] bg-white/5 px-3 py-2 text-caption">
                    <strong>${count} dòng</strong> — ${escapeHtml(reason)}
                  </li>`,
                )
                .join('')}</ul>`
            : ''
        }
        ${
          sampleRows.length
            ? `<ul class="import-report__list mt-2 grid list-none gap-2 p-0">${sampleRows
                .map(
                  (item) => `
                  <li class="grid gap-1 rounded-[14px] bg-white/5 px-3 py-2.5">
                    <strong>Dòng ${item.rowNumber}:</strong> ${escapeHtml(item.reason)}
                    <span class="text-caption text-muted">${escapeHtml(item.rawData.join(' | ') || '—')}</span>
                  </li>
                `,
                )
                .join('')}${
                importReport.diagnostics.length > sampleRows.length
                  ? `<li class="text-caption text-muted px-1">… và ${importReport.diagnostics.length - sampleRows.length} dòng khác</li>`
                  : ''
              }</ul>`
            : ''
        }
      </details>
    `;
      })()
    : '';

  return `
    <section class="panel panel--bank flex min-h-0 w-full min-w-0 max-w-full flex-col gap-3 self-start overflow-x-clip rounded-[20px] px-4 py-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.28)]">
      <div class="bank-toolbar flex flex-wrap items-center gap-2">
        <button class="btn btn-primary btn--compact" data-action="start-add-question" ${category ? '' : 'disabled'}>
          + Thêm câu
        </button>
        <label class="btn btn-ghost btn--compact bank-import-btn relative m-0 cursor-pointer">
          Nhập Excel
          <input id="excel-input" class="bank-import-btn__input" type="file" accept=".xlsx,.xls" aria-label="Nhập Excel" />
        </label>
        <button
          type="button"
          class="btn btn-danger btn--compact"
          data-action="clear-category-questions"
          ${category && category.questions.length ? '' : 'disabled'}
        >
          Xóa hết câu
        </button>
      </div>

      <div class="bank-categories category-strip mb-0 w-full max-w-full min-w-0 touch-pan-x overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch]" data-scroll-restore="bank-categories" role="tablist" aria-label="Lĩnh vực">
        ${renderCategoryTabs(appState, category?.id)}
        <button type="button" class="category-pill category-pill--add" data-action="add-category" aria-label="Thêm lĩnh vực">+</button>
      </div>

      ${importSummary}

      <div class="question-list grid min-h-0 flex-1 gap-2" data-scroll-restore="question-list">
        ${questions || `<div class="empty-state px-4 py-7 text-center text-ui text-subtle">${emptyMessage}</div>`}
      </div>

      ${showForm ? `<div class="bank-form-panel mt-1 border-t border-white/10 pt-3">${renderQuestionForm(runtime)}</div>` : ''}
    </section>
  `;
}
