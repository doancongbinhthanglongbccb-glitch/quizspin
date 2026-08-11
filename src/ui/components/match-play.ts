import type { AppState } from '../../types';
import type { RuntimeState } from '../../core/state';
import {
  findQuestionById,
  getQuestionOptions,
  isEssayQuestion,
  isMcqCorrectOption,
  isMcqOptionSelected,
  isMcqQuestion,
  isMultipleMcqQuestion,
} from '../../data';
import { escapeHtml } from '../../utils/html';
import {
  formatMatchTimerClock,
  matchTimerRatio,
  matchTimerUrgency,
} from '../../utils/match-timer-ui';
import { MATCH_ROUND_NAMES } from '../../config/match';
import { renderMatchNextScreenButton } from './match-next-screen';

/** Hiển thị điểm có dấu — scores[3] có thể âm sau khi tách từ floor tổng. */
function formatMatchScore(score: number): string {
  return String(Math.round(score));
}

function stripOptionLetterPrefix(option: string, letter: string): string {
  const stripped = option.replace(new RegExp(`^${letter}[.):\\-]?\\s*`, 'i'), '').trim();
  return stripped || option;
}

function renderTimebar(remaining: number, total: number, bonusWindowSec?: number): string {
  const ratio = matchTimerRatio(remaining, total);
  const urgency = matchTimerUrgency(remaining, total);
  const urgencyClass =
    urgency === 'danger' ? ' quiz-timebar--danger' : urgency === 'warning' ? ' quiz-timebar--warning' : '';

  const bonusSec = bonusWindowSec !== undefined ? Math.max(0, Math.min(total, bonusWindowSec)) : null;
  const marker =
    bonusSec !== null && total > 0
      ? `<div class="quiz-timebar__bonus-mark" style="left:${(((total - bonusSec) / total) * 100).toFixed(2)}%" title="Hết cửa sổ điểm gói"></div>`
      : '';

  return `
    <div
      class="quiz-timebar${urgencyClass}"
      data-match-timebar
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="${total}"
      aria-valuenow="${remaining}"
      aria-label="Còn ${remaining} giây"
    >
      <div class="quiz-timebar__fill" data-match-timebar-fill style="width:${(ratio * 100).toFixed(2)}%"></div>
      ${marker}
    </div>
  `;
}

function renderMetaTimerPill(remaining: number, total: number): string {
  const value = formatMatchTimerClock(remaining);
  const urgency = matchTimerUrgency(remaining, total);
  const urgencyClass =
    urgency === 'danger'
      ? ' quiz-meta__timer--danger'
      : urgency === 'warning'
        ? ' quiz-meta__timer--warning'
        : '';

  return `
    <span
      class="quiz-meta__timer${urgencyClass}"
      data-match-timer-pill
      aria-label="Còn ${remaining} giây"
    >
      <span data-match-timer-value>${value}</span>
    </span>
  `;
}

function renderMatchRoundProgress(round: 1 | 2 | 3): string {
  const name = MATCH_ROUND_NAMES[round];
  const dots = ([1, 2, 3] as const)
    .map((step) => {
      const state = step < round ? 'done' : step === round ? 'current' : 'todo';
      return `<span class="match-round-progress__dot match-round-progress__dot--${state}" aria-hidden="true"></span>`;
    })
    .join('');

  return `
    <div class="match-round-progress" aria-label="${name}">
      <span class="match-round-progress__label">${name}</span>
      <span class="match-round-progress__dots">${dots}</span>
    </div>
  `;
}

function renderContextFooter(contextButtonHtml: string): string {
  if (!contextButtonHtml.trim()) {
    return '';
  }
  return `
    <footer class="quiz-session__footer">
      ${contextButtonHtml}
    </footer>
  `;
}

export function getMatchPlayMountKey(runtime: RuntimeState): string {
  const session = runtime.matchSession;
  if (!session) {
    return '';
  }

  const play = session.activePlay;
  const summary = session.roundSummary;
  if (session.showFinalSummary && !play && !summary) {
    return `final|${formatMatchScore(session.scores[1])}|${formatMatchScore(session.scores[2])}|${formatMatchScore(session.scores[3])}`;
  }

  if (!play && !summary) {
    // L2 vòng đề / L3 luật hiện trên tab Quay (spinRoundView), không overlay
    return `session|${session.currentRound}|spin|u${session.usedQuestionIds.length}`;
  }

  if (summary && !play) {
    return `summary|${summary.round}|${Math.round(summary.score * 100)}`;
  }

  if (!play) {
    return '';
  }

  return [
    session.currentRound,
    play.round,
    play.phase,
    play.currentIndex,
    play.questionIds.join(','),
    play.selectedPackageId ?? '',
    play.playerAnswer,
    play.lastIsCorrect === null ? 'pending' : play.lastIsCorrect ? '1' : '0',
    Math.round(play.roundScore * 100),
    Object.entries(session.round3PackageRemaining)
      .map(([id, left]) => `${id}:${left}`)
      .join(','),
  ].join('|');
}

export function renderMatchPlay(appState: AppState, runtime: RuntimeState): string {
  const session = runtime.matchSession;
  if (!session) {
    return '';
  }

  if (session.showFinalSummary && !session.activePlay && !session.roundSummary) {
    const s1 = session.scores[1];
    const s2 = session.scores[2];
    const s3 = session.scores[3];
    const total = s1 + s2 + s3;
    const totalClass = total < 0 ? ' match-final-hero__value--negative' : '';
    const s3Class = s3 < 0 ? ' match-final-act--negative' : '';

    return `
      <div class="quiz-session-backdrop match-play-backdrop">
        <div class="quiz-session match-play match-play--final">
          <div class="quiz-session__content match-play__content match-final">
            <main class="quiz-session__main match-final__main">
              <header class="match-final__head">
                <p class="match-final__eyebrow">Kết thúc ván</p>
                <h2 class="match-final__title">Tổng kết</h2>
              </header>

              <div class="match-final-hero" role="status" aria-label="Tổng điểm ${formatMatchScore(total)}">
                <p class="match-final-hero__value${totalClass}">${formatMatchScore(total)}</p>
                <p class="match-final-hero__label">Tổng điểm</p>
              </div>

              <ol class="match-final-board" aria-label="Điểm từng màn">
                <li class="match-final-act">
                  <span class="match-final-act__index" aria-hidden="true">01</span>
                  <span class="match-final-act__name">${MATCH_ROUND_NAMES[1]}</span>
                  <strong class="match-final-act__score">${formatMatchScore(s1)}</strong>
                </li>
                <li class="match-final-act">
                  <span class="match-final-act__index" aria-hidden="true">02</span>
                  <span class="match-final-act__name">${MATCH_ROUND_NAMES[2]}</span>
                  <strong class="match-final-act__score">${formatMatchScore(s2)}</strong>
                </li>
                <li class="match-final-act${s3Class}">
                  <span class="match-final-act__index" aria-hidden="true">03</span>
                  <span class="match-final-act__name">${MATCH_ROUND_NAMES[3]}</span>
                  <strong class="match-final-act__score">${formatMatchScore(s3)}</strong>
                </li>
              </ol>
            </main>
            <footer class="quiz-session__footer">
              <button type="button" class="btn btn-primary quiz-session__submit-btn" data-action="match-close-session">Về vòng quay</button>
            </footer>
          </div>
        </div>
      </div>
    `;
  }

  if (session.roundSummary && !session.activePlay) {
    const { round, score } = session.roundSummary;
    const runningTotal = session.scores[1] + session.scores[2] + session.scores[3];
    const title = `Kết thúc ${MATCH_ROUND_NAMES[round]}`;
    const nextRound = round < 3 ? ((round + 1) as 2 | 3) : null;
    const nextScreenButton =
      nextRound !== null
        ? renderMatchNextScreenButton({ nextRound, action: 'match-continue-round' })
        : '';
    const contentClass =
      nextRound !== null ? 'quiz-session__content match-play__content match-play__content--with-next' : 'quiz-session__content match-play__content';
    const footer =
      nextRound === null
        ? `
            <footer class="quiz-session__footer">
              <button type="button" class="btn btn-primary quiz-session__submit-btn" data-action="match-continue-round">
                Xem tổng kết
              </button>
            </footer>`
        : '';

    return `
      <div class="quiz-session-backdrop match-play-backdrop">
        <div class="quiz-session match-play">
          <div class="${contentClass}">
            ${renderMatchRoundProgress(round)}
            <main class="quiz-session__main">
              <header class="quiz-session__question-head">
                <span class="quiz-session__badge" style="--badge-color:#2d6a4f">${MATCH_ROUND_NAMES[round]}</span>
                <h2 class="quiz-session__title">${title}</h2>
              </header>
              <div class="quiz-score" role="status">
                <p class="quiz-score__value">${formatMatchScore(score)}</p>
                <p class="quiz-score__label">ĐIỂM ${MATCH_ROUND_NAMES[round].toUpperCase()}</p>
              </div>
              <p class="quiz-session__hint match-round-total">Tổng tạm: <strong>${formatMatchScore(runningTotal)}</strong></p>
            </main>
            ${nextScreenButton}
            ${footer}
          </div>
        </div>
      </div>
    `;
  }

  const play = session.activePlay;
  if (!play) {
    // Idle L2/L3: UI trên màn Quay theo spinRoundView
    return '';
  }

  const matchSettings = appState.settings.match;
  const questionId = play.questionIds[play.currentIndex];
  const question = questionId ? findQuestionById(appState.categories, questionId) : null;
  const total = play.questionIds.length;
  const currentNum = play.currentIndex + 1;

  if (play.phase === 'picking-package' && matchSettings) {
    const sortedPackages = [...matchSettings.round3Packages]
      .filter((pkg) => {
        if (pkg.id === matchSettings.round3DefaultPackageId) {
          return true;
        }
        return (session.round3PackageRemaining[pkg.id] ?? 0) > 0;
      })
      .sort((a, b) => a.points - b.points);

    const packages = sortedPackages
      .map((pkg, index) => {
        const isDefault = pkg.id === matchSettings.round3DefaultPackageId;
        const left = session.round3PackageRemaining[pkg.id];
        const tier =
          index === sortedPackages.length - 1 ? 'high' : index === 0 ? 'low' : 'mid';
        const meta = isDefault
          ? '<span class="match-package-btn__meta">Mặc định</span>'
          : left !== undefined
            ? `<span class="match-package-btn__meta">còn ${left}</span>`
            : '';
        return `
          <button
            type="button"
            class="match-package-btn match-package-btn--${tier}${isDefault ? ' match-package-btn--default' : ''}"
            data-action="match-select-package"
            data-package-id="${escapeHtml(pkg.id)}"
          >
            <span class="match-package-btn__points">+${pkg.points}</span>
            <span class="match-package-btn__unit">điểm</span>
            <span class="match-package-btn__timer">${pkg.timerSec}s giữ điểm</span>
            ${meta}
          </button>`;
      })
      .join('');

    const showTimer = play.timerSec > 0;
    const questionTitle = question ? escapeHtml(question.question) : 'Chọn gói điểm';

    return `
      <div class="quiz-session-backdrop match-play-backdrop">
        <div class="quiz-session match-play">
          <div class="quiz-session__content match-play__content">
            ${showTimer ? renderTimebar(play.remaining, play.timerSec) : ''}
            ${renderMatchRoundProgress(3)}
            <header class="quiz-meta">
              <span class="quiz-session__badge" style="--badge-color:${play.accentColor}">${escapeHtml(play.label)} · Câu ${currentNum}/${total}</span>
              <div class="quiz-meta__right">
                <span class="quiz-meta__score" role="status">Điểm ${formatMatchScore(play.roundScore)}</span>
                ${showTimer ? renderMetaTimerPill(play.remaining, play.timerSec) : ''}
              </div>
            </header>
            <main class="quiz-session__main">
              <header class="quiz-session__question-head">
                <h2 class="quiz-session__title">${questionTitle}</h2>
              </header>
              <div class="match-package-grid" role="group" aria-label="Gói điểm ${MATCH_ROUND_NAMES[3]}">${packages}</div>
            </main>
            ${renderContextFooter(`
              <button type="button" class="btn btn-ghost" data-action="match-apply-default-package">Dùng gói mặc định</button>
            `)}
          </div>
        </div>
      </div>
    `;
  }

  if (!question) {
    return `
      <div class="quiz-session-backdrop match-play-backdrop">
        <div class="quiz-session match-play">
          <p class="text-muted p-6">Không tìm thấy câu hỏi.</p>
        </div>
      </div>
    `;
  }

  const showTimer = play.phase === 'answering' && play.timerSec > 0;
  const selectedPackage =
    play.selectedPackageId && matchSettings
      ? matchSettings.round3Packages.find((pkg) => pkg.id === play.selectedPackageId)
      : null;
  const bonusWindowSec = selectedPackage?.timerSec;
  const badge = `<span class="quiz-session__badge" style="--badge-color:${play.accentColor}">${escapeHtml(play.label)} · Câu ${currentNum}/${total}</span>`;
  const meta = `
    ${renderMatchRoundProgress(play.round)}
    <header class="quiz-meta">
      ${badge}
      <div class="quiz-meta__right">
        <span class="quiz-meta__score" role="status">Điểm ${formatMatchScore(play.roundScore)}</span>
        ${showTimer ? renderMetaTimerPill(play.remaining, play.timerSec) : ''}
      </div>
    </header>
  `;

  let body = '';
  if (isMcqQuestion(question)) {
    const isMultiple = isMultipleMcqQuestion(question);
    const isResult = play.phase === 'revealed';
    const options = getQuestionOptions(question)
      .map((option, index) => {
        const letter = String.fromCharCode(65 + index);
        const optionText = stripOptionLetterPrefix(option, letter);
        const isSelected = isMcqOptionSelected(play.playerAnswer, option, question);
        const isCorrectOption = isResult && isMcqCorrectOption(option, question);
        const isWrongSelected = isResult && isSelected && !isMcqCorrectOption(option, question);
        const classes = [
          'quiz-option',
          isSelected ? 'quiz-option--selected' : '',
          isCorrectOption ? 'quiz-option--correct' : '',
          isWrongSelected ? 'quiz-option--wrong' : '',
          isResult ? 'quiz-option--locked' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return `<button
          type="button"
          class="${classes}"
          data-action="match-choose-mcq"
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

    const resultBanner =
      isResult && play.lastIsCorrect !== null
        ? `<div class="quiz-answer-reveal" role="status">
            <p class="quiz-answer-reveal__title">${play.lastIsCorrect ? '✓ Đúng' : '✗ Sai'} · ${play.lastPointsDelta >= 0 ? '+' : ''}${formatMatchScore(play.lastPointsDelta)} điểm</p>
            <pre class="quiz-answer-reveal__content">${escapeHtml(question.answer)}</pre>
          </div>`
        : '';

    body = `
      <div class="quiz-session__question-head">
        <h2 class="quiz-session__title">${escapeHtml(question.question)}</h2>
      </div>
      <div class="quiz-options" role="${isMultiple ? 'group' : 'radiogroup'}">${options}</div>
      ${resultBanner}
    `;
  } else if (isEssayQuestion(question)) {
    const waitingJudge = play.phase === 'revealed' && play.lastIsCorrect === null;
    const judged = play.phase === 'revealed' && play.lastIsCorrect !== null;

    if (play.phase === 'answering') {
      body = `
        <div class="quiz-session__question-head">
          <h2 class="quiz-session__title">${escapeHtml(question.question)}</h2>
        </div>
      `;
    } else {
      body = `
        <div class="quiz-session__question-head">
          <h2 class="quiz-session__title">${escapeHtml(question.question)}</h2>
        </div>
        <div class="quiz-answer-reveal" role="status">
          <p class="quiz-answer-reveal__title">Đáp án đúng</p>
          <pre class="quiz-answer-reveal__content">${escapeHtml(question.answer)}</pre>
        </div>
        ${
          waitingJudge
            ? `<div class="match-judge-actions" role="group" aria-label="MC chấm tự luận">
                <button type="button" class="btn btn-primary" data-action="match-judge-essay" data-correct="1">Đúng</button>
                <button type="button" class="btn btn-danger" data-action="match-judge-essay" data-correct="0">Sai</button>
              </div>`
            : judged
              ? `<div class="quiz-answer-reveal" role="status">
                  <p class="quiz-answer-reveal__title">${play.lastIsCorrect ? '✓ Đúng' : '✗ Sai'} · ${play.lastPointsDelta >= 0 ? '+' : ''}${formatMatchScore(play.lastPointsDelta)} điểm</p>
                </div>`
              : ''
        }
      `;
    }
  }

  let contextButton = '';
  if (play.phase === 'answering' && isEssayQuestion(question)) {
    contextButton = `<button type="button" class="btn btn-submit quiz-session__submit-btn" data-action="match-reveal-essay">Đã trả lời xong</button>`;
  } else if (play.phase === 'answering' && isMcqQuestion(question) && isMultipleMcqQuestion(question)) {
    contextButton = `<button type="button" class="btn btn-submit quiz-session__submit-btn" data-action="match-confirm-mcq" ${play.playerAnswer.trim() ? '' : 'disabled'}>Chốt đáp án</button>`;
  } else if (play.phase === 'revealed' && play.lastIsCorrect !== null) {
    contextButton = `<button type="button" class="btn btn-primary quiz-session__submit-btn" data-action="match-next-question">
      ${play.currentIndex + 1 >= play.questionIds.length ? 'Kết thúc màn' : 'Câu tiếp'}
    </button>`;
  }

  return `
    <div class="quiz-session-backdrop match-play-backdrop">
      <div class="quiz-session match-play match-play--question">
        <div class="quiz-session__content match-play__content">
          ${showTimer ? renderTimebar(play.remaining, play.timerSec, bonusWindowSec) : ''}
          ${meta}
          <main class="quiz-session__main">
            <div class="quiz-session__body">${body}</div>
          </main>
          ${renderContextFooter(contextButton)}
        </div>
      </div>
    </div>
  `;
}
