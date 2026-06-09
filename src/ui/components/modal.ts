import { QUESTION_MODAL_CONFIG } from '../../config/question-modal';
import type { RuntimeState } from '../../core/state';
import type { AppState } from '../../types';
import { getQuestionOptions, isEssayQuestion, isMcqAnswerCorrect, isMcqQuestion } from '../../data';
import { escapeHtml } from '../../utils/html';

function stripOptionLetterPrefix(option: string, letter: string): string {
  const stripped = option.replace(new RegExp(`^${letter}[.):\\-]?\\s*`, 'i'), '').trim();
  return stripped || option;
}

export function renderModal(appState: AppState, runtime: RuntimeState): string {
  const modal = runtime.modal;
  if (!modal) {
    return '';
  }

  if (modal.kind === 'question') {
    const category = appState.categories.find((item) => item.id === modal.categoryId);
    const question = category?.questions.find((item) => item.id === modal.questionId);
    if (!category || !question) {
      return '';
    }

    const readOnly = modal.readOnly === true;
    const isPreparing = modal.isPreparing && !readOnly;
    const revealed = modal.revealed;
    const submitted = modal.submitted;
    const showResults = readOnly || revealed || submitted;
    const locked = showResults;
    const selectedAnswer = modal.selectedAnswer;
    const remaining = Math.max(0, modal.remaining);
    const total = Math.max(1, modal.timer);
    const progress = remaining / total;
    const danger = !isPreparing && remaining > 0 && remaining <= 5;
    const radius = 46;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - progress);

    const prepareSec = QUESTION_MODAL_CONFIG.prepareSec;
    const prepareRemaining = Math.max(0, modal.prepareRemaining);
    const prepareProgress = prepareRemaining / prepareSec;
    const prepareDashOffset = circumference * (1 - prepareProgress);

    const prepareTimerRing = `
      <div class="modal-timer modal-timer--prepare flex flex-col items-center gap-4 px-0 py-2 pb-1">
        <div
          class="timer-ring timer-ring--prepare timer-ring--large timer-ring--hero"
          data-question-prepare-ring
          data-timer-circumference="${circumference}"
          aria-label="Chuẩn bị — còn ${Math.max(1, prepareRemaining)} giây"
          style="--timer-circumference:${circumference};--timer-offset:${prepareDashOffset}"
        >
          <svg viewBox="0 0 100 100" class="timer-ring__svg" aria-hidden="true">
            <defs>
              <linearGradient id="timer-ring-grad-prepare" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#fef3c7" />
                <stop offset="40%" stop-color="#fbbf24" />
                <stop offset="100%" stop-color="#d97706" />
              </linearGradient>
            </defs>
            <circle
              class="timer-ring__track"
              cx="50"
              cy="50"
              r="${radius}"
              pathLength="${circumference}"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="0"
            />
            <circle
              class="timer-ring__progress timer-ring__progress--prepare"
              data-question-prepare-progress
              cx="50"
              cy="50"
              r="${radius}"
              pathLength="${circumference}"
              stroke="url(#timer-ring-grad-prepare)"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${prepareDashOffset}"
            />
          </svg>
          <div class="timer-ring__center">
            <span class="timer-ring__prepare-label">Chuẩn bị...</span>
            <span class="timer-ring__value timer-ring__value--prepare" data-question-prepare-value>${Math.max(1, prepareRemaining)}</span>
            <span class="timer-ring__unit">giây</span>
          </div>
        </div>
        <p class="modal-prepare-hint m-0 text-center text-sm font-semibold leading-snug text-amber-200/90">
          Đọc câu hỏi bắt đầu
        </p>
      </div>
    `;

    const timerRing = `
      <div class="modal-timer flex justify-center px-0 py-2 pb-1">
        <div
          class="timer-ring timer-ring--large timer-ring--hero ${danger ? 'timer-ring--danger' : ''}"
          data-question-timer-ring
          data-timer-total="${total}"
          data-timer-circumference="${circumference}"
          aria-label="Còn ${remaining} giây"
          style="--timer-circumference:${circumference};--timer-offset:${dashOffset}"
        >
          <svg viewBox="0 0 100 100" class="timer-ring__svg" aria-hidden="true">
            <defs>
              <linearGradient id="timer-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ede9fe" />
                <stop offset="35%" stop-color="#c4b5fd" />
                <stop offset="68%" stop-color="#8b5cf6" />
                <stop offset="100%" stop-color="#6d28d9" />
              </linearGradient>
              <linearGradient id="timer-ring-grad-danger" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#fecaca" />
                <stop offset="45%" stop-color="#f87171" />
                <stop offset="100%" stop-color="#dc2626" />
              </linearGradient>
              <filter id="timer-ring-glow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="4.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <circle
              class="timer-ring__track"
              cx="50"
              cy="50"
              r="${radius}"
              pathLength="${circumference}"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="0"
            />
            <circle
              class="timer-ring__progress"
              data-question-timer-progress
              cx="50"
              cy="50"
              r="${radius}"
              pathLength="${circumference}"
              stroke="${danger ? 'url(#timer-ring-grad-danger)' : 'url(#timer-ring-grad)'}"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${dashOffset}"
              filter="url(#timer-ring-glow)"
            />
          </svg>
          <div class="timer-ring__center">
            <span class="timer-ring__value" data-question-timer-value>${remaining}</span>
            <span class="timer-ring__unit">giây</span>
          </div>
        </div>
      </div>
    `;

    const badge = `<span class="badge modal-category-badge" style="background:${category.color}">${escapeHtml(category.name)}</span>`;

    const isMcq = isMcqQuestion(question);
    const options = isMcq
      ? `<div class="option-grid" role="radiogroup" aria-label="Chọn đáp án">
          ${getQuestionOptions(question)
            .map((option, index) => {
              const letter = String.fromCharCode(65 + index);
              const optionText = stripOptionLetterPrefix(option, letter);
              const isCorrect = showResults && isMcqAnswerCorrect(option, question);
              const isWrong = showResults && selectedAnswer === option && !isMcqAnswerCorrect(selectedAnswer, question);
              const isSelectedOption = selectedAnswer === option;
              const classes = [
                'option-chip',
                isSelectedOption ? 'option-chip--selected' : '',
                isCorrect ? 'option-chip--correct' : '',
                isWrong ? 'option-chip--wrong' : '',
                locked ? 'option-chip--locked' : '',
              ]
                .filter(Boolean)
                .join(' ');

              return `<button
                type="button"
                class="${classes}"
                data-action="choose-answer"
                data-answer="${encodeURIComponent(option)}"
                role="radio"
                aria-checked="${isSelectedOption ? 'true' : 'false'}"
                ${locked ? 'disabled' : ''}
              >
                <span class="option-chip__letter">${letter}</span>
                <span class="option-chip__text">${escapeHtml(optionText)}</span>
              </button>`;
            })
            .join('')}
        </div>`
      : '';

    const essayInput = isEssayQuestion(question)
      ? `<div class="essay-answer grid gap-2.5">
          <label class="field-label" for="essay-answer-input">Đáp án của bạn</label>
          <textarea
            id="essay-answer-input"
            class="textarea textarea--large textarea--auto"
            data-action="player-answer-input"
            placeholder="Gõ câu trả lời của bạn vào đây..."
            rows="5"
            ${locked ? 'disabled' : ''}
          >${escapeHtml(modal.playerAnswer ?? '')}</textarea>
        </div>`
      : '';

    const answerBox =
      readOnly || revealed || submitted
        ? `<div class="answer-box answer-box--revealed" role="status">
          <div class="answer-box__title">✓ Đáp án đúng</div>
          <pre class="answer-box__content">${escapeHtml(question.answer)}</pre>
        </div>`
        : '';

    const reviewBadge = readOnly
      ? `<span class="badge modal-review-badge">Xem lại</span>`
      : '';

    const hasEssayAnswer = !!(modal.playerAnswer && modal.playerAnswer.trim());

    const pauseButton =
      !readOnly && !submitted && !isPreparing
        ? `<button class="btn btn-ghost" data-action="toggle-pause">${modal.paused ? 'Tiếp tục' : 'Tạm dừng'}</button>`
        : '';

    const revealButton =
      readOnly || submitted
        ? ''
        : revealed
          ? `<button class="btn btn-accent" data-action="reveal-answer">Đóng</button>`
          : `<button class="btn btn-accent" data-action="reveal-answer">Hiện đáp án</button>`;

    const submitButton =
      readOnly || submitted
        ? `<button class="btn btn-primary" data-action="close-modal">Đóng</button>`
        : isMcq
          ? ''
          : hasEssayAnswer
            ? `<button class="btn btn-submit" data-action="submit-answer">Nộp đáp án</button>`
            : '';

    const skipPrepareButton = `<button type="button" class="btn btn-skip-prepare" data-action="skip-prepare">Bắt đầu ngay</button>`;

    const modalActions = isPreparing
      ? `<div class="modal-actions modal-actions--center modal-actions--prepare flex flex-wrap justify-center">
          ${skipPrepareButton}
        </div>`
      : readOnly
      ? `<div class="modal-actions modal-actions--center flex flex-wrap justify-center">
          <button class="btn btn-primary" data-action="close-modal">Đóng</button>
        </div>`
      : submitted
        ? `<div class="modal-actions modal-actions--center flex flex-wrap justify-center">${submitButton}</div>`
        : isMcq
          ? `<div class="modal-actions modal-actions--question modal-actions--mcq">
              <div class="modal-actions__slot modal-actions__slot--left">${pauseButton}</div>
              <div class="modal-actions__slot modal-actions__slot--center">${revealButton}</div>
            </div>`
          : `<div class="modal-actions modal-actions--question">
              <div class="modal-actions__slot modal-actions__slot--left">${pauseButton}</div>
              <div class="modal-actions__slot modal-actions__slot--center">${revealButton}</div>
              <div class="modal-actions__slot modal-actions__slot--right">${submitButton}</div>
            </div>`;

    return `
      <div class="modal-backdrop modal-backdrop--question fixed inset-0 z-20 animate-modal-backdrop-in bg-slate-950/75 backdrop-blur-sm">
        <section class="modal-card modal-card--question ${readOnly ? 'modal-card--readonly' : ''}">
          ${readOnly || submitted ? '' : isPreparing ? prepareTimerRing : timerRing}
          <div class="modal-meta flex flex-wrap justify-center gap-2">${badge}${reviewBadge}</div>
          <h2 class="modal-title">${escapeHtml(question.question)}</h2>
          ${options}
          ${essayInput}
          ${answerBox}
          ${modalActions}
        </section>
      </div>
    `;
  }

  if (modal.kind === 'gift') {
    return `
      <div class="modal-backdrop fixed inset-0 z-20 grid place-items-center p-4 animate-modal-backdrop-in bg-slate-950/75 backdrop-blur-sm">
        <section class="modal-card modal-card--simple grid gap-[18px] text-center">
          <div class="modal-eyebrow text-ui uppercase tracking-[0.18em] text-muted">${modal.title}</div>
          <div class="modal-gift text-[clamp(1.4rem,4vw,2.7rem)] font-extrabold leading-tight text-muted">${modal.text}</div>
          <div class="modal-actions modal-actions--center flex flex-wrap justify-center">
            <button class="btn btn-primary" data-action="close-modal">Đóng</button>
          </div>
        </section>
      </div>
    `;
  }

  return `
    <div class="modal-backdrop fixed inset-0 z-20 grid place-items-center p-4 animate-modal-backdrop-in bg-slate-950/75 backdrop-blur-sm">
      <section class="modal-card modal-card--simple grid gap-[18px] text-center">
        <div class="modal-notice text-[clamp(1.4rem,4vw,2.7rem)] font-extrabold leading-tight text-muted">${modal.text}</div>
        <div class="modal-actions modal-actions--center flex flex-wrap justify-center">
          <button class="btn btn-primary" data-action="close-modal">Đóng</button>
        </div>
      </section>
    </div>
  `;
}
