import type { RuntimeState } from '../../core/state';
import type { AppState } from '../../types';
import { findQuestionById, getQuestionOptions, isEssayQuestion, isMcqCorrectOption, isMcqQuestion, isMcqOptionSelected, isMultipleMcqQuestion } from '../../data';
import { DEFAULTS } from '../../config';
import { QUIZ_CONFIG } from '../../config/quiz';
import { escapeHtml } from '../../utils/html';
import { syncQuizProgressDom, syncQuizQuestionGrid } from '../../utils/quiz-timer-dom';

function stripOptionLetterPrefix(option: string, letter: string): string {
  const stripped = option.replace(new RegExp(`^${letter}[.):\\-]?\\s*`, 'i'), '').trim();
  return stripped || option;
}

/** Hiển thị mm:ss hoặc ss cho timer */
function formatTimerDisplay(seconds: number): { value: string; unit: string } {
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return { value: `${m}:${String(s).padStart(2, '0')}`, unit: 'phút' };
  }
  return { value: String(seconds), unit: 'giây' };
}

function computeMaxPoints(appState: AppState, questionIds: string[]): number {
  return questionIds.reduce((sum, id) => {
    const q = findQuestionById(appState.categories, id);
    return sum + (q?.points ?? DEFAULTS.questionPoints);
  }, 0);
}

function renderTimerRing(remaining: number, total: number): string {
  const progress = remaining / Math.max(1, total);
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);
  const danger = remaining > 0 && remaining <= QUIZ_CONFIG.dangerThresholdSec;
  const warning = remaining > QUIZ_CONFIG.dangerThresholdSec && remaining <= QUIZ_CONFIG.warningThresholdSec;
  const stateClass = danger ? 'timer-ring--danger' : warning ? 'timer-ring--warning' : '';
  const { value, unit } = formatTimerDisplay(remaining);

  return `
    <div
      class="timer-ring timer-ring--quiz-hero ${stateClass}"
      data-quiz-timer-ring
      data-timer-circumference="${circumference}"
      aria-label="Còn ${remaining} giây"
      style="--timer-circumference:${circumference};--timer-offset:${dashOffset}"
    >
      <svg viewBox="0 0 100 100" class="timer-ring__svg" aria-hidden="true">
        <defs>
          <linearGradient id="quiz-timer-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ede9fe" />
            <stop offset="100%" stop-color="#6d28d9" />
          </linearGradient>
          <linearGradient id="quiz-timer-grad-warning" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fde68a" />
            <stop offset="100%" stop-color="#d97706" />
          </linearGradient>
          <linearGradient id="quiz-timer-grad-danger" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fecaca" />
            <stop offset="100%" stop-color="#dc2626" />
          </linearGradient>
        </defs>
        <circle class="timer-ring__track" cx="50" cy="50" r="${radius}" pathLength="${circumference}" stroke-dasharray="${circumference}" />
        <circle
          class="timer-ring__progress"
          data-quiz-timer-progress
          cx="50" cy="50" r="${radius}"
          pathLength="${circumference}"
          stroke="${danger ? 'url(#quiz-timer-grad-danger)' : warning ? 'url(#quiz-timer-grad-warning)' : 'url(#quiz-timer-grad)'}"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${dashOffset}"
        />
      </svg>
      <div class="timer-ring__center">
        <span class="timer-ring__value" data-quiz-timer-value>${value}</span>
        <span class="timer-ring__unit" data-quiz-timer-unit>${unit}</span>
      </div>
    </div>
  `;
}

function renderScoreBlock(
  appState: AppState,
  session: NonNullable<RuntimeState['quizSession']>,
): string {
  if (session.phase === 'result') {
    const earned = session.earnedPoints ?? 0;
    const max = session.maxPoints ?? 0;
    return `
      <div class="quiz-score" role="status">
        <p class="quiz-score__value">${earned}</p>
        <p class="quiz-score__label">ĐIỂM · ${earned}/${max}</p>
      </div>
    `;
  }

  const maxPoints = computeMaxPoints(appState, session.questionIds);
  return `
    <div class="quiz-score">
      <p class="quiz-score__value">${maxPoints}</p>
      <p class="quiz-score__label">TỔNG ĐIỂM</p>
    </div>
  `;
}

function renderSidebar(
  appState: AppState,
  session: NonNullable<RuntimeState['quizSession']>,
  answeredFlags: boolean[],
): string {
  const total = session.questionIds.length;
  const answeredCount = answeredFlags.filter(Boolean).length;
  const currentNum = session.currentIndex + 1;

  return `
    <aside class="quiz-session__sidebar" aria-label="Tiến độ bài thi">
      ${renderScoreBlock(appState, session)}

      ${
        session.phase === 'active'
          ? `<div class="quiz-session__timer-wrap">${renderTimerRing(session.remaining, session.timerSec)}</div>`
          : '<p class="quiz-session__submitted m-0 text-center text-caption text-white/50">Đã nộp bài</p>'
      }

      <div class="quiz-session__progress-label">
        <span class="quiz-session__progress-current">Câu ${currentNum}/${total}</span>
        <span class="quiz-session__progress-answered">${answeredCount} đã trả lời</span>
      </div>

      <div class="quiz-grid" role="navigation" aria-label="Danh sách câu hỏi">
        ${session.questionIds
          .map((_, index) => {
            const answered = answeredFlags[index];
            const isCurrent = index === session.currentIndex;
            const classes = [
              'quiz-grid__item',
              isCurrent ? 'quiz-grid__item--current' : '',
              answered ? 'quiz-grid__item--answered' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return `<button
              type="button"
              class="${classes}"
              data-action="quiz-goto"
              data-quiz-index="${index}"
              data-quiz-grid-item
              aria-current="${isCurrent ? 'step' : 'false'}"
              aria-label="Câu ${index + 1}${answered ? ', đã trả lời' : ''}"
            >${index + 1}</button>`;
          })
          .join('')}
      </div>
    </aside>
  `;
}

function renderQuestionBody(
  appState: AppState,
  session: NonNullable<RuntimeState['quizSession']>,
): string {
  const questionId = session.questionIds[session.currentIndex];
  const question = questionId ? findQuestionById(appState.categories, questionId) : null;
  if (!question) {
    return '<p class="text-muted">Không tìm thấy câu hỏi.</p>';
  }

  const playerAnswer = session.answers[questionId] ?? '';
  const isResult = session.phase === 'result';
  const result = session.results?.find((item) => item.questionId === questionId);
  const showReview = isResult && result;

  const badge = `<span class="quiz-session__badge" style="--badge-color:${session.categoryColor}">${escapeHtml(session.categoryName)}</span>`;

  if (isMcqQuestion(question)) {
    const isMultiple = isMultipleMcqQuestion(question);

    const options = getQuestionOptions(question)
      .map((option, index) => {
        const letter = String.fromCharCode(65 + index);
        const optionText = stripOptionLetterPrefix(option, letter);
        const isSelected = isMcqOptionSelected(playerAnswer, option, question);
        const isCorrectOption = showReview && isMcqCorrectOption(option, question);
        const isWrongSelected = showReview && isSelected && !isMcqCorrectOption(option, question);

        const classes = [
          'quiz-option',
          isSelected ? 'quiz-option--selected' : '',
          isCorrectOption && showReview ? 'quiz-option--correct' : '',
          isWrongSelected ? 'quiz-option--wrong' : '',
          isResult ? 'quiz-option--locked' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return `<button
          type="button"
          class="${classes}"
          data-action="quiz-choose"
          data-answer="${encodeURIComponent(option)}"
          role="${isMultiple ? 'checkbox' : 'radio'}"
          aria-checked="${isSelected ? 'true' : 'false'}"
          ${isResult ? 'disabled' : ''}
        >
          <span class="quiz-option__letter">${letter}</span>
          <span class="quiz-option__text">${escapeHtml(optionText)}</span>
        </button>`;
      })
      .join('');

    const hint = isMultiple
      ? '<p class="quiz-session__hint">Chọn tất cả đáp án đúng (nhiều lựa chọn)</p>'
      : '';

    const answerReveal =
      showReview && result
        ? `<div class="quiz-answer-reveal" role="status">
            <p class="quiz-answer-reveal__title">${result.isCorrect ? '✓ Đúng' : '✗ Sai'} — Đáp án đúng</p>
            <pre class="quiz-answer-reveal__content">${escapeHtml(question.answer)}</pre>
          </div>`
        : '';

    return `
      <header class="quiz-session__question-head">
        ${badge}
        <h2 class="quiz-session__title">${escapeHtml(question.question)}</h2>
        ${hint}
      </header>
      <div class="quiz-options" role="${isMultiple ? 'group' : 'radiogroup'}" aria-label="Chọn đáp án">${options}</div>
      ${answerReveal}
    `;
  }

  const essayBlock = isEssayQuestion(question)
    ? isResult
      ? `<div class="quiz-essay">
          <p class="quiz-essay__label">Bài làm của bạn</p>
          <pre class="quiz-essay-preview">${escapeHtml(playerAnswer || '(Chưa trả lời)')}</pre>
          <div class="quiz-answer-reveal">
            <p class="quiz-answer-reveal__title">Đáp án tham khảo</p>
            <pre class="quiz-answer-reveal__content">${escapeHtml(question.answer)}</pre>
          </div>
        </div>`
      : `<div class="quiz-essay">
          <label class="quiz-essay__label" for="quiz-essay-input">Câu trả lời tự luận</label>
          <textarea
            id="quiz-essay-input"
            class="textarea textarea--large textarea--auto quiz-essay__input"
            data-action="quiz-essay-input"
            placeholder="Gõ câu trả lời..."
            rows="8"
          >${escapeHtml(playerAnswer)}</textarea>
        </div>`
    : '';

  return `
    <header class="quiz-session__question-head">
      ${badge}
      <h2 class="quiz-session__title">${escapeHtml(question.question)}</h2>
    </header>
    ${essayBlock}
  `;
}

function renderResultSummary(session: NonNullable<RuntimeState['quizSession']>): string {
  if (session.phase !== 'result') {
    return '';
  }

  const correct = session.correctCount ?? 0;
  const total = session.totalGradable ?? 0;

  return `
    <div class="quiz-result-banner" role="status">
      <p class="quiz-result-banner__score">${correct}/${total} câu trắc nghiệm đúng</p>
    </div>
  `;
}

function renderFooter(session: NonNullable<RuntimeState['quizSession']>): string {
  const isFirst = session.currentIndex <= 0;
  const isLast = session.currentIndex >= session.questionIds.length - 1;

  if (session.phase === 'result') {
    return `
      <footer class="quiz-session__footer">
        <button type="button" class="btn btn-ghost quiz-session__nav-btn" data-action="quiz-prev" ${isFirst ? 'disabled' : ''}>← Trước</button>
        <button type="button" class="btn btn-primary quiz-session__submit-btn" data-action="quiz-close">Về vòng quay</button>
        <button type="button" class="btn btn-ghost quiz-session__nav-btn" data-action="quiz-next" ${isLast ? 'disabled' : ''}>Sau →</button>
      </footer>
    `;
  }

  return `
    <footer class="quiz-session__footer">
      <button type="button" class="btn btn-ghost quiz-session__nav-btn" data-action="quiz-prev" ${isFirst ? 'disabled' : ''}>← Trước</button>
      <button type="button" class="btn btn-submit quiz-session__submit-btn" data-action="quiz-submit">Nộp bài</button>
      <button type="button" class="btn btn-ghost quiz-session__nav-btn" data-action="quiz-next" ${isLast ? 'disabled' : ''}>Sau →</button>
    </footer>
  `;
}

export function renderQuizSession(appState: AppState, runtime: RuntimeState): string {
  const session = runtime.quizSession;
  if (!session) {
    return '';
  }

  const answeredFlags = session.questionIds.map((id) => !!(session.answers[id] ?? '').trim());

  return `
    <div class="quiz-session-backdrop">
      <div class="quiz-session">
        ${renderSidebar(appState, session, answeredFlags)}
        <div class="quiz-session__content">
          <main class="quiz-session__main">
            ${renderResultSummary(session)}
            <div class="quiz-session__body" data-quiz-question-id="${session.questionIds[session.currentIndex] ?? ''}">
              ${renderQuestionBody(appState, session)}
            </div>
          </main>
          ${renderFooter(session)}
        </div>
      </div>
    </div>
  `;
}

export function getQuizMountKey(appState: AppState, runtime: RuntimeState): string {
  const session = runtime.quizSession;
  if (!session) {
    return '';
  }

  return [
    session.phase,
    session.categoryId ?? 'practice',
    session.questionIds.join(','),
    session.timerSec,
    session.phase === 'result' ? String(session.correctCount) : 'active',
    session.phase === 'result' ? String(session.earnedPoints) : '',
  ].join('|');
}

/** Thay đổi câu / đáp án — cập nhật DOM cục bộ, không rebuild overlay */
export function getQuizViewKey(appState: AppState, runtime: RuntimeState): string {
  const session = runtime.quizSession;
  if (!session) {
    return '';
  }

  const questionId = session.questionIds[session.currentIndex] ?? '';
  const answersSig = session.questionIds.map((id) => ((session.answers[id] ?? '').trim() ? '1' : '0')).join('');

  return [session.currentIndex, questionId, answersSig].join('|');
}

export function syncQuizSessionView(
  appState: AppState,
  runtime: RuntimeState,
  root: ParentNode = document,
): void {
  const session = runtime.quizSession;
  if (!session) {
    return;
  }

  const questionId = session.questionIds[session.currentIndex] ?? '';
  const body = root.querySelector<HTMLElement>('.quiz-session__body');
  if (body && body.dataset.quizQuestionId !== questionId) {
    body.dataset.quizQuestionId = questionId;
    body.innerHTML = renderQuestionBody(appState, session);
  }

  const footer = root.querySelector<HTMLElement>('.quiz-session__footer');
  if (footer) {
    footer.outerHTML = renderFooter(session);
  }

  const answeredFlags = session.questionIds.map((id) => !!(session.answers[id] ?? '').trim());
  syncQuizQuestionGrid(root, session.currentIndex, answeredFlags);
  syncQuizProgressDom(answeredFlags.filter(Boolean).length, session.questionIds.length);

  if (body && body.dataset.quizQuestionId === questionId) {
    const question = findQuestionById(appState.categories, questionId);
    if (!question) {
      return;
    }

    const playerAnswer = session.answers[questionId] ?? '';
    root.querySelectorAll<HTMLElement>('[data-action="quiz-choose"]').forEach((button) => {
      const answer = button.dataset.answer;
      if (!answer) {
        return;
      }
      const decoded = decodeURIComponent(answer);
      const isSelected = isMcqOptionSelected(playerAnswer, decoded, question);
      button.classList.toggle('quiz-option--selected', isSelected);
      button.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    });
  }
}

/** @deprecated Dùng getQuizMountKey + getQuizViewKey */
export function getQuizRenderKey(appState: AppState, runtime: RuntimeState): string {
  return [getQuizMountKey(appState, runtime), getQuizViewKey(appState, runtime)].join('||');
}
