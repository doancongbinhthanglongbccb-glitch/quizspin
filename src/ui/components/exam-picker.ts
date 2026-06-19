import type { ExamPicker, PracticeSetupDraft } from '../../types';
import { QUIZ_CONFIG } from '../../config/quiz';
import { escapeHtml } from '../../utils/html';

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

function presetBtn(active: boolean, label: string, value: string, action: string): string {
  return `
    <button
      type="button"
      class="exam-picker__chip ${active ? 'exam-picker__chip--active' : ''}"
      data-action="${action}"
      data-value="${value}"
    >${escapeHtml(label)}</button>
  `;
}

function renderPracticeSetup(draft: PracticeSetupDraft): string {
  const questionPresets = QUIZ_CONFIG.practiceQuestionPresets
    .map((count) =>
      presetBtn(
        draft.questionPreset === count,
        `${count} câu`,
        String(count),
        'practice-question-preset',
      ),
    )
    .join('');

  const timerPresets = QUIZ_CONFIG.practiceTimerPresetsMin
    .map((min) =>
      presetBtn(
        draft.timerPreset === String(min),
        `${min} phút`,
        String(min),
        'practice-timer-preset',
      ),
    )
    .join('');

  return `
    <h2 id="exam-picker-title" class="exam-picker__title m-0 mb-4 text-title font-extrabold">Thi thử</h2>

    <div class="exam-picker__section">
      <p class="exam-picker__section-label">Số câu hỏi</p>
      <div class="exam-picker__chips" role="group" aria-label="Số câu hỏi">
        ${questionPresets}
        ${presetBtn(draft.questionPreset === 'custom', 'Tùy chỉnh', 'custom', 'practice-question-preset')}
      </div>
      ${
        draft.questionPreset === 'custom'
          ? `<label class="sr-only" for="practice-custom-count">Số câu tùy chỉnh</label>
             <input
               id="practice-custom-count"
               type="number"
               min="${QUIZ_CONFIG.practiceQuestionMin}"
               max="${QUIZ_CONFIG.practiceQuestionMax}"
               class="input mt-2 w-full"
               data-action="practice-custom-count"
               value="${escapeHtml(draft.customQuestionCount)}"
               placeholder="VD: 25"
             />`
          : ''
      }
    </div>

    <div class="exam-picker__section mt-4">
      <p class="exam-picker__section-label">Thời gian thi</p>
      <div class="exam-picker__chips" role="group" aria-label="Thời gian thi">
        ${timerPresets}
        ${presetBtn(draft.timerPreset === 'unlimited', 'Không giới hạn', 'unlimited', 'practice-timer-preset')}
        ${presetBtn(draft.timerPreset === 'custom', 'Tùy chỉnh', 'custom', 'practice-timer-preset')}
      </div>
      ${
        draft.timerPreset === 'custom'
          ? `<label class="sr-only" for="practice-custom-timer">Thời gian tùy chỉnh (phút)</label>
             <input
               id="practice-custom-timer"
               type="number"
               min="${QUIZ_CONFIG.practiceTimerMinMin}"
               max="${QUIZ_CONFIG.practiceTimerMaxMin}"
               class="input mt-2 w-full"
               data-action="practice-custom-timer"
               value="${escapeHtml(draft.customTimerMin)}"
               placeholder="VD: 45"
             />`
          : ''
      }
    </div>
  `;
}

export function getExamPickerRenderKey(picker: ExamPicker, draft: PracticeSetupDraft | null): string {
  if (!picker) {
    return '';
  }
  if (picker.kind === 'category') {
    return `category|${picker.categoryId}|${picker.exams.map((e) => e.id).join(',')}`;
  }
  return `practice|${JSON.stringify(draft ?? {})}`;
}

export function renderExamPicker(picker: ExamPicker, draft: PracticeSetupDraft | null): string {
  if (!picker) {
    return '';
  }

  const body =
    picker.kind === 'category'
      ? renderCategoryExamList(picker)
      : renderPracticeSetup(draft ?? { questionPreset: 20, customQuestionCount: '25', timerPreset: '30', customTimerMin: '45' });

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
