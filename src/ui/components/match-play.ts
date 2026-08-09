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
import { WheelRenderer } from './wheel';

/** Hiển thị điểm có dấu — scores[3] có thể âm sau khi tách từ floor tổng. */
function formatMatchScore(score: number): string {
  return String(Math.round(score));
}

function stripOptionLetterPrefix(option: string, letter: string): string {
  const stripped = option.replace(new RegExp(`^${letter}[.):\\-]?\\s*`, 'i'), '').trim();
  return stripped || option;
}

function formatTimerDisplay(seconds: number): { value: string; unit: string } {
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return { value: `${m}:${String(s).padStart(2, '0')}`, unit: 'phút' };
  }
  return { value: String(seconds), unit: 'giây' };
}

function renderTimerRing(remaining: number, total: number): string {
  const progress = remaining / Math.max(1, total);
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);
  const { value, unit } = formatTimerDisplay(remaining);

  return `
    <div
      class="timer-ring timer-ring--quiz-hero"
      data-match-timer-ring
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
        </defs>
        <circle class="timer-ring__track" cx="50" cy="50" r="${radius}" pathLength="${circumference}" stroke-dasharray="${circumference}" />
        <circle
          class="timer-ring__progress"
          data-match-timer-progress
          cx="50" cy="50" r="${radius}"
          pathLength="${circumference}"
          stroke="url(#quiz-timer-grad)"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${dashOffset}"
        />
      </svg>
      <div class="timer-ring__center">
        <span class="timer-ring__value" data-match-timer-value>${value}</span>
        <span class="timer-ring__unit" data-match-timer-unit>${unit}</span>
      </div>
    </div>
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
    if (session.currentRound === 2 && session.round2Packs.length > 0) {
      return `session|2|packs|${session.round2Packs.map((pack) => pack.id).join(',')}`;
    }
    if (session.currentRound === 3) {
      return 'session|3|rules';
    }
    return `session|${session.currentRound}|idle`;
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
    const s3Class = s3 < 0 ? ' match-final-score--negative' : '';

    return `
      <div class="quiz-session-backdrop match-play-backdrop">
        <div class="quiz-session match-play">
          <div class="quiz-session__content match-play__content">
            <main class="quiz-session__main">
              <header class="quiz-session__question-head">
                <span class="quiz-session__badge" style="--badge-color:#90be6d">Kết thúc ván</span>
                <h2 class="quiz-session__title">Tổng kết 3 lượt</h2>
                <p class="quiz-session__hint">Lượt 3 dùng gói điểm ăn/thua — điểm lượt có thể âm nếu tổng trừ (câu sai) lớn hơn tổng cộng (câu đúng)</p>
              </header>
              <ul class="match-final-scores" aria-label="Điểm từng lượt">
                <li class="match-final-score"><span>Lượt 1</span><strong>${formatMatchScore(s1)}</strong></li>
                <li class="match-final-score"><span>Lượt 2</span><strong>${formatMatchScore(s2)}</strong></li>
                <li class="match-final-score${s3Class}"><span>Lượt 3</span><strong>${formatMatchScore(s3)}</strong></li>
                <li class="match-final-score match-final-score--total"><span>Tổng</span><strong>${formatMatchScore(total)}</strong></li>
              </ul>
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
    const total = session.scores[1] + session.scores[2] + session.scores[3];
    return `
      <div class="quiz-session-backdrop match-play-backdrop">
        <div class="quiz-session match-play">
          <div class="quiz-session__content match-play__content">
            <main class="quiz-session__main">
              <header class="quiz-session__question-head">
                <span class="quiz-session__badge" style="--badge-color:#90be6d">Lượt ${round}</span>
                <h2 class="quiz-session__title">Kết thúc Lượt ${round}</h2>
                <p class="quiz-session__hint">Điểm lượt: ${formatMatchScore(score)} · Tổng tạm: ${formatMatchScore(total)}</p>
              </header>
              <div class="quiz-score" role="status">
                <p class="quiz-score__value">${formatMatchScore(score)}</p>
                <p class="quiz-score__label">ĐIỂM LƯỢT ${round}</p>
              </div>
            </main>
            <footer class="quiz-session__footer">
              <button type="button" class="btn btn-primary quiz-session__submit-btn" data-action="match-continue-round">
                Tiếp tục
              </button>
            </footer>
          </div>
        </div>
      </div>
    `;
  }

  const play = session.activePlay;
  if (!play) {
    if (session.currentRound === 2 && session.round2Packs.length > 0) {
      const packCount = session.round2Packs.length;
      const spinDisabled = runtime.spinning ? 'disabled' : '';
      return `
        <div class="quiz-session-backdrop match-play-backdrop">
          <div class="quiz-session match-play match-play--round2">
            <div class="quiz-session__content match-play__content">
              <main class="quiz-session__main match-round2-main">
                <header class="quiz-session__question-head">
                  <span class="quiz-session__badge" style="--badge-color:#4895ef">Lượt 2</span>
                  <h2 class="quiz-session__title">Quay chọn đề</h2>
                  <p class="quiz-session__hint">${packCount} bộ đề · Điểm L1: ${formatMatchScore(session.scores[1])}</p>
                </header>
                <div class="match-round2-wheel spin-wheel-zone">
                  ${WheelRenderer.renderHTML(runtime.spinning)}
                </div>
              </main>
              <footer class="quiz-session__footer">
                <button
                  type="button"
                  class="btn btn-spin quiz-session__submit-btn"
                  data-action="match-spin-round2"
                  ${spinDisabled}
                  aria-label="Quay chọn đề Lượt 2"
                >
                  QUAY CHỌN ĐỀ
                </button>
              </footer>
            </div>
          </div>
        </div>
      `;
    }

    if (session.currentRound === 3) {
      const matchSettings = appState.settings.match;
      const questionCount = matchSettings?.round3QuestionCount ?? 0;
      const packages = matchSettings?.round3Packages ?? [];
      const packageRows = packages
        .map((pkg) => {
          const isDefault = pkg.id === matchSettings?.round3DefaultPackageId;
          return `
            <tr>
              <td>${escapeHtml(String(pkg.points))} điểm${isDefault ? ' <span class="text-muted">(mặc định)</span>' : ''}</td>
              <td>${escapeHtml(String(pkg.timerSec))} giây</td>
            </tr>`;
        })
        .join('');

      return `
        <div class="quiz-session-backdrop match-play-backdrop">
          <div class="quiz-session match-play">
            <div class="quiz-session__content match-play__content">
              <main class="quiz-session__main">
                <header class="quiz-session__question-head">
                  <span class="quiz-session__badge" style="--badge-color:#f72585">Lượt 3</span>
                  <h2 class="quiz-session__title">Lượt 3 có ${questionCount} câu</h2>
                  <p class="quiz-session__hint">Mỗi câu chọn gói điểm trước khi trả lời. Đúng cộng · Sai trừ (tổng không âm). Tổng tạm: ${formatMatchScore(session.scores[1] + session.scores[2])}</p>
                </header>
                <div class="match-rules-table-wrap">
                  <table class="match-rules-table" aria-label="Gói điểm Lượt 3">
                    <thead>
                      <tr><th>Điểm gói</th><th>Thời gian</th></tr>
                    </thead>
                    <tbody>${packageRows}</tbody>
                  </table>
                </div>
              </main>
              <footer class="quiz-session__footer">
                <button type="button" class="btn btn-primary quiz-session__submit-btn" data-action="match-confirm-start-round3">
                  Xác nhận – Bắt đầu
                </button>
              </footer>
            </div>
          </div>
        </div>
      `;
    }

    return '';
  }

  const matchSettings = appState.settings.match;
  const questionId = play.questionIds[play.currentIndex];
  const question = questionId ? findQuestionById(appState.categories, questionId) : null;
  const total = play.questionIds.length;
  const currentNum = play.currentIndex + 1;

  if (play.phase === 'picking-package' && matchSettings) {
    const packages = matchSettings.round3Packages
      .map((pkg) => {
        const isDefault = pkg.id === matchSettings.round3DefaultPackageId;
        return `
          <button
            type="button"
            class="match-package-btn"
            data-action="match-select-package"
            data-package-id="${escapeHtml(pkg.id)}"
          >
            <span class="match-package-btn__points">+${pkg.points} điểm</span>
            <span class="match-package-btn__timer">${pkg.timerSec}s</span>
            ${isDefault ? '<span class="match-package-btn__default">Mặc định</span>' : ''}
          </button>`;
      })
      .join('');

    return `
      <div class="quiz-session-backdrop match-play-backdrop">
        <div class="quiz-session match-play">
          <div class="quiz-session__content match-play__content">
            <main class="quiz-session__main">
              <header class="quiz-session__question-head">
                <span class="quiz-session__badge" style="--badge-color:${play.accentColor}">${escapeHtml(play.label)} · Câu ${currentNum}/${total}</span>
                <h2 class="quiz-session__title">Chọn gói điểm</h2>
                <p class="quiz-session__hint">Đúng cộng · Sai trừ (không âm tổng). Không chọn trong ${matchSettings.round3PackagePickSec}s → gói mặc định</p>
              </header>
              <div class="match-package-grid" role="group" aria-label="Gói điểm Lượt 3">${packages}</div>
            </main>
            <footer class="quiz-session__footer">
              <button type="button" class="btn btn-ghost" data-action="match-apply-default-package">Dùng gói mặc định</button>
            </footer>
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
  const scoreBlock = `
    <div class="quiz-score" role="status">
      <p class="quiz-score__value">${formatMatchScore(play.roundScore)}</p>
      <p class="quiz-score__label">${play.round === 3 ? 'ĐIỂM HIỆN CÓ' : `ĐIỂM LƯỢT ${play.round}`}</p>
    </div>
  `;

  const badge = `<span class="quiz-session__badge" style="--badge-color:${play.accentColor}">${escapeHtml(play.label)} · Câu ${currentNum}/${total}</span>`;

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
      <header class="quiz-session__question-head">
        ${badge}
        <h2 class="quiz-session__title">${escapeHtml(question.question)}</h2>
        ${isMultiple && !isResult ? '<p class="quiz-session__hint">Chọn tất cả đáp án đúng rồi bấm Chốt đáp án</p>' : ''}
      </header>
      <div class="quiz-options" role="${isMultiple ? 'group' : 'radiogroup'}">${options}</div>
      ${resultBanner}
    `;
  } else if (isEssayQuestion(question)) {
    const waitingJudge = play.phase === 'revealed' && play.lastIsCorrect === null;
    const judged = play.phase === 'revealed' && play.lastIsCorrect !== null;

    if (play.phase === 'answering') {
      body = `
        <header class="quiz-session__question-head">
          ${badge}
          <h2 class="quiz-session__title">${escapeHtml(question.question)}</h2>
          <p class="quiz-session__hint">Tự luận miệng — khi xong, bấm nút bên dưới (hoặc chờ hết giờ)</p>
        </header>
      `;
    } else {
      body = `
        <header class="quiz-session__question-head">
          ${badge}
          <h2 class="quiz-session__title">${escapeHtml(question.question)}</h2>
        </header>
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

  const footer =
    play.phase === 'answering' && isEssayQuestion(question)
      ? `<footer class="quiz-session__footer">
          <button type="button" class="btn btn-submit quiz-session__submit-btn" data-action="match-reveal-essay">Đã trả lời xong</button>
        </footer>`
      : play.phase === 'answering' && isMcqQuestion(question) && isMultipleMcqQuestion(question)
        ? `<footer class="quiz-session__footer">
            <button type="button" class="btn btn-submit quiz-session__submit-btn" data-action="match-confirm-mcq" ${play.playerAnswer.trim() ? '' : 'disabled'}>Chốt đáp án</button>
          </footer>`
      : play.phase === 'revealed' && play.lastIsCorrect !== null
        ? `<footer class="quiz-session__footer">
            <button type="button" class="btn btn-primary quiz-session__submit-btn" data-action="match-next-question">
              ${play.currentIndex + 1 >= play.questionIds.length ? 'Chốt lượt' : 'Câu tiếp'}
            </button>
          </footer>`
        : '<footer class="quiz-session__footer"></footer>';

  return `
    <div class="quiz-session-backdrop match-play-backdrop">
      <div class="quiz-session match-play">
        <aside class="quiz-session__sidebar" aria-label="Tiến độ lượt">
          ${scoreBlock}
          ${showTimer ? `<div class="quiz-session__timer-wrap">${renderTimerRing(play.remaining, play.timerSec)}</div>` : ''}
          <div class="quiz-session__progress-label">
            <span class="quiz-session__progress-current">Câu ${currentNum}/${total}</span>
            <span class="quiz-session__progress-answered">Lượt ${play.round}</span>
          </div>
        </aside>
        <div class="quiz-session__content">
          <main class="quiz-session__main">
            <div class="quiz-session__body">${body}</div>
          </main>
          ${footer}
        </div>
      </div>
    </div>
  `;
}
