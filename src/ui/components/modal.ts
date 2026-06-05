import type { AppState, RuntimeState } from '../../core/state';
import { getQuestionOptions, isEssayQuestion, isMcqQuestion } from '../../data';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

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

    const revealed = modal.revealed;
    const submitted = modal.submitted;
    const locked = revealed || submitted;
    const selectedAnswer = modal.selectedAnswer;
    const remaining = Math.max(0, modal.remaining);
    const total = Math.max(1, modal.timer);
    const progress = remaining / total;
    const danger = remaining > 0 && remaining <= 5;
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - progress);

    const timerRing = `
      <div class="modal-timer">
        <div
          class="timer-ring timer-ring--large ${danger ? 'timer-ring--danger' : ''}"
          aria-label="Còn ${remaining} giây"
          style="--timer-circumference:${circumference};--timer-offset:${dashOffset}"
        >
          <svg viewBox="0 0 100 100" class="timer-ring__svg" aria-hidden="true">
            <defs>
              <linearGradient id="timer-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#4cc9f0" />
                <stop offset="100%" stop-color="#4895ef" />
              </linearGradient>
              <linearGradient id="timer-ring-grad-danger" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#f87171" />
                <stop offset="100%" stop-color="#ef4444" />
              </linearGradient>
              <filter id="timer-ring-glow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
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
            <span class="timer-ring__value">${remaining}</span>
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
              const isCorrect = revealed && option === question.answer;
              const isWrong = revealed && selectedAnswer === option && !isCorrect;
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
                <span class="option-chip__check" aria-hidden="true"></span>
              </button>`;
            })
            .join('')}
        </div>`
      : '';

    const essayInput = isEssayQuestion(question)
      ? `<div class="essay-answer">
          <label class="field-label" for="essay-answer-input">Đáp án của bạn</label>
          <textarea
            id="essay-answer-input"
            class="textarea textarea--large textarea--auto"
            data-action="player-answer-input"
            placeholder="Nhập đáp án của bạn..."
            rows="5"
            ${locked ? 'disabled' : ''}
          >${escapeHtml(modal.playerAnswer ?? '')}</textarea>
        </div>`
      : '';

    const answerBox = revealed
      ? `<div class="answer-box answer-box--revealed">
          <div class="answer-box__title">Đáp án đúng</div>
          <pre>${escapeHtml(question.answer)}</pre>
        </div>`
      : '';

    const hasAnswer =
      !!(modal.playerAnswer && modal.playerAnswer.trim()) || !!(selectedAnswer && selectedAnswer.trim());

    const submitButton =
      hasAnswer && !submitted
        ? `<button class="btn btn-submit" data-action="submit-answer">Nộp đáp án</button>`
        : '';

    return `
      <div class="modal-backdrop">
        <section class="modal-card modal-card--question">
          ${timerRing}
          <div class="modal-meta">${badge}</div>
          <h2 class="modal-title">${escapeHtml(question.question)}</h2>
          ${options}
          ${essayInput}
          ${answerBox}
          <div class="modal-actions modal-actions--question">
            <div class="modal-actions__slot modal-actions__slot--left">
              <button class="btn btn-ghost" data-action="toggle-pause">${modal.paused ? 'Tiếp tục' : 'Tạm dừng'}</button>
            </div>
            <div class="modal-actions__slot modal-actions__slot--center">
              <button class="btn btn-accent" data-action="reveal-answer">${revealed ? 'Đóng' : 'Hiện đáp án'}</button>
            </div>
            <div class="modal-actions__slot modal-actions__slot--right">
              ${submitButton}
            </div>
          </div>
        </section>
      </div>
    `;
  }

  if (modal.kind === 'gift') {
    return `
      <div class="modal-backdrop">
        <section class="modal-card modal-card--simple">
          <div class="modal-eyebrow">${modal.title}</div>
          <div class="modal-gift">${modal.text}</div>
          <div class="modal-actions modal-actions--center">
            <button class="btn btn-primary" data-action="close-modal">Đóng</button>
          </div>
        </section>
      </div>
    `;
  }

  return `
    <div class="modal-backdrop">
      <section class="modal-card modal-card--simple">
        <div class="modal-notice">${modal.text}</div>
        <div class="modal-actions modal-actions--center">
          <button class="btn btn-primary" data-action="close-modal">Đóng</button>
        </div>
      </section>
    </div>
  `;
}
