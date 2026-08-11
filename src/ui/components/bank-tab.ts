import type { RuntimeState } from '../../core/state';
import type { AppState, Question } from '../../types';
import { escapeHtml } from '../../utils/html';
import { currentCategory } from '../../core/actions';
import { MAX_CATEGORIES } from '../../config';
import {
  getQuestionOptions,
  isMcqQuestion,
  isMultipleMcqQuestion,
} from '../../data';

function renderQuestionForm(runtime: RuntimeState): string {
  const draft = runtime.questionDraft;

  return `
    <div class="bank-form-card">
      <div class="bank-form-card__head">
        <h3 class="bank-form-card__title">${runtime.editingQuestionId ? 'Sửa câu hỏi' : 'Thêm câu hỏi'}</h3>
        <button type="button" class="btn btn-ghost btn--compact" data-action="cancel-question-edit" aria-label="Đóng form">✕</button>
      </div>

      <div class="bank-form-card__body">
        <div class="bank-form-field">
          <label class="bank-form-label" for="question-input">Câu hỏi</label>
          <textarea
            class="textarea textarea--compact"
            id="question-input"
            data-draft-field="question"
            placeholder="Nhập nội dung câu hỏi..."
          >${escapeHtml(draft.question)}</textarea>
        </div>

        <div class="bank-form-field">
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
          <input
            class="input"
            id="answer-input"
            data-draft-field="answer"
            type="text"
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
            inputmode="text"
            placeholder="VD: C hoặc A, C (nhiều đáp án cách nhau bởi dấu phẩy)"
            value="${escapeHtml(draft.answer)}"
          />
        </div>
      </div>

      <div class="bank-form-card__actions">
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
    <div class="question-row${isActive ? ' question-row--active' : ''}">
      <div class="question-row__body">
        <div class="question-row__title">${escapeHtml(question.question)}</div>
        <div class="question-row__meta">${optionLabel}${question.points ? ` · ${question.points}đ` : ''}</div>
      </div>
      <div class="question-row__actions">
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
        const tone = failed ? 'import-report--fail' : 'import-report--ok';

        return `
      <details class="import-report import-report--compact ${tone}" ${failed ? 'open' : ''}>
        <summary class="import-report__summary">
          ${
            failed
              ? `Không nhập được câu nào · Bỏ qua ${importReport.skipped} dòng`
              : `Nhập Excel: ${importReport.imported} câu · Bỏ qua ${importReport.skipped}`
          }
        </summary>
        <p class="import-report__hint">
          Cột: <strong>Câu hỏi | Phương án | Đáp án đúng</strong>
        </p>
        ${
          grouped.length
            ? `<ul class="import-report__list">${grouped
                .map(
                  ([reason, count]) => `
                  <li class="import-report__item">
                    <strong>${count} dòng</strong> — ${escapeHtml(reason)}
                  </li>`,
                )
                .join('')}</ul>`
            : ''
        }
        ${
          sampleRows.length
            ? `<ul class="import-report__list">${sampleRows
                .map(
                  (item) => `
                  <li class="import-report__item import-report__item--detail">
                    <strong>Dòng ${item.rowNumber}:</strong> ${escapeHtml(item.reason)}
                    <span class="import-report__raw">${escapeHtml(item.rawData.join(' | ') || '—')}</span>
                  </li>
                `,
                )
                .join('')}${
                importReport.diagnostics.length > sampleRows.length
                  ? `<li class="import-report__more">… và ${importReport.diagnostics.length - sampleRows.length} dòng khác</li>`
                  : ''
              }</ul>`
            : ''
        }
      </details>
    `;
      })()
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
        <button
          type="button"
          class="btn btn-danger btn--compact"
          data-action="clear-category-questions"
          ${category && category.questions.length ? '' : 'disabled'}
        >
          Xóa hết câu
        </button>
      </div>

      <div class="bank-categories category-strip" data-scroll-restore="bank-categories" role="tablist" aria-label="Lĩnh vực">
        ${renderCategoryTabs(appState, category?.id)}
        ${
          appState.categories.length < MAX_CATEGORIES
            ? '<button type="button" class="category-pill category-pill--add" data-action="add-category" aria-label="Thêm lĩnh vực">+</button>'
            : ''
        }
      </div>
      <p class="bank-category-limit">
        Lĩnh vực ${appState.categories.length}/${MAX_CATEGORIES}
      </p>

      ${importSummary}

      <div class="question-list" data-scroll-restore="question-list">
        ${questions || `<div class="empty-state">${emptyMessage}</div>`}
      </div>

      ${showForm ? `<div class="bank-form-panel">${renderQuestionForm(runtime)}</div>` : ''}
    </section>
  `;
}
