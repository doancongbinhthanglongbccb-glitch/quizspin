import type { ExamPicker, PracticeSetupDraft } from '../../types';
import { escapeHtml } from '../../utils/html';
import { createDefaultPracticeSetupDraft } from '../../core/exam-generator';

function renderCategoryExamList(picker: Extract<ExamPicker, { kind: 'category' }>): string {
  const items = picker.exams
    .map(
      (exam) => `
      <button
        type="button"
        class="exam-picker__exam-btn"
        data-action="select-category-exam"
        data-exam-id="${escapeHtml(exam.id)}"
      >
        <span class="exam-picker__exam-title">${escapeHtml(exam.title)}</span>
        <span class="exam-picker__exam-meta">${exam.questionCount} câu hỏi</span>
      </button>
    `,
    )
    .join('');

  return `
    <h2 id="exam-picker-title" class="exam-picker__title m-0 mb-4 text-title font-extrabold">
      Chọn đề — ${escapeHtml(picker.categoryName)}
    </h2>
    <div class="exam-picker__exam-list" role="list">${items}</div>
  `;
}

function numericInputAttrs(): string {
  return 'inputmode="numeric" pattern="[0-9]*" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="done"';
}

function renderPracticeSetup(draft: PracticeSetupDraft): string {
  return `
    <h2 id="exam-picker-title" class="exam-picker__title m-0 mb-4 text-title font-extrabold">Thi thử</h2>

    <div class="exam-picker__section">
      <label class="exam-picker__section-label" for="practice-question-count">Số câu hỏi</label>
      <input
        id="practice-question-count"
        type="text"
        class="input w-full"
        data-action="practice-question-count"
        value="${escapeHtml(draft.questionCount)}"
        ${numericInputAttrs()}
      />
    </div>

    <div class="exam-picker__section mt-4">
      <label class="exam-picker__section-label" for="practice-timer-min">Thời gian thi (phút)</label>
      <input
        id="practice-timer-min"
        type="text"
        class="input w-full"
        data-action="practice-timer-min"
        value="${escapeHtml(draft.timerMin)}"
        ${draft.timerUnlimited ? 'disabled' : ''}
        ${numericInputAttrs()}
      />
      <label class="exam-picker__check mt-2 flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          class="checkbox"
          data-action="practice-timer-unlimited"
          ${draft.timerUnlimited ? 'checked' : ''}
        />
        <span>Không giới hạn thời gian</span>
      </label>
    </div>
  `;
}

export function getExamPickerRenderKey(picker: ExamPicker, _draft: PracticeSetupDraft | null): string {
  if (!picker) {
    return '';
  }
  if (picker.kind === 'category') {
    return `category|${picker.categoryId}|${picker.exams.map((e) => e.id).join(',')}`;
  }
  return 'practice';
}

export function renderExamPicker(picker: ExamPicker, draft: PracticeSetupDraft | null): string {
  if (!picker) {
    return '';
  }

  const body =
    picker.kind === 'category'
      ? renderCategoryExamList(picker)
      : renderPracticeSetup(draft ?? createDefaultPracticeSetupDraft());

  const footer =
    picker.kind === 'practice'
      ? `
        <button type="button" class="btn btn-ghost" data-action="cancel-exam-picker">Hủy</button>
        <button type="button" class="btn btn-primary" data-action="start-practice-exam">Bắt đầu thi</button>
      `
      : `<button type="button" class="btn btn-ghost" data-action="cancel-exam-picker">Đóng</button>`;

  return `
    <div class="exam-picker-backdrop fixed inset-0 z-[28] grid place-items-center p-4 animate-modal-backdrop-in bg-slate-950/80 backdrop-blur-[10px]" role="presentation">
      <section
        class="exam-picker-card w-full max-w-[480px] animate-modal-card-in rounded-[22px] border border-white/10 bg-panel-modal px-5 pb-[18px] pt-[22px] shadow-[0_24px_64px_rgba(0,0,0,0.5)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exam-picker-title"
      >
        ${body}
        <div class="exam-picker__actions mt-5 flex flex-wrap justify-end gap-2.5">${footer}</div>
      </section>
    </div>
  `;
}
