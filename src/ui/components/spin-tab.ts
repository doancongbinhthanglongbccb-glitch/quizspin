import type { AppState, MatchRoundId } from '../../types';
import type { RuntimeState } from '../../core/state';
import { appContext } from '../../core/state';
import { MATCH_ROUND_NAMES, buildRound3PackageQuotas } from '../../config/match';
import { getAvailableMatchExamPacks, isMatchExamPackUsed } from '../../core/match-questions';
import { countUsedQuestionsInBank } from '../../core/pool-manager';
import { getSpinRound2PoolPacks } from '../../core/actions/spin-actions';
import { WheelRenderer } from './wheel';
import { escapeHtml } from '../../utils/html';

const ROUND1 = MATCH_ROUND_NAMES[1];
const ROUND2 = MATCH_ROUND_NAMES[2];
const ROUND3 = MATCH_ROUND_NAMES[3];

function formatScore(score: number): string {
  return String(Math.round(score));
}

function bankQuestionCount(appState: AppState): number {
  return appState.categories.reduce((count, category) => count + category.questions.length, 0);
}

function usedProgressLabel(appState: AppState): { used: number; total: number; text: string } {
  const used = countUsedQuestionsInBank(appContext.getQuestionPools(), appState.categories);
  const total = bankQuestionCount(appState);
  return { used, total, text: `Đã dùng ${used}/${total}` };
}

function isMatchIdle(runtime: RuntimeState, round: 2 | 3): boolean {
  const session = runtime.matchSession;
  if (
    !session ||
    session.currentRound !== round ||
    session.activePlay ||
    session.roundSummary ||
    session.showFinalSummary
  ) {
    return false;
  }
  if (round === 2) {
    const alreadyPlayed = session.round2Packs.some((pack) =>
      isMatchExamPackUsed(pack, session.usedQuestionIds),
    );
    if (alreadyPlayed) {
      return false;
    }
    return getAvailableMatchExamPacks(session.round2Packs, session.usedQuestionIds).length > 0;
  }
  return true;
}

function renderSpinRoundTabs(view: MatchRoundId, matchRound: MatchRoundId | null): string {
  const tabs = ([1, 2, 3] as const)
    .map((step) => {
      let state: 'current' | 'done' | 'todo' = 'todo';
      if (step === view) {
        state = 'current';
      } else if (matchRound !== null ? step <= matchRound : step === 1) {
        state = 'done';
      }

      return `
        <button
          type="button"
          class="spin-round-tabs__tab spin-round-tabs__tab--${state}"
          role="tab"
          aria-selected="${step === view ? 'true' : 'false'}"
          data-action="set-spin-round-view"
          data-round="${step}"
        >
          ${MATCH_ROUND_NAMES[step]}
        </button>`;
    })
    .join('');

  return `
    <div class="spin-round-tabs" role="tablist" aria-label="Ba màn trong ván">
      ${tabs}
    </div>
  `;
}

function renderRound1Actions(appState: AppState, runtime: RuntimeState): string {
  const status = runtime.spinning
    ? 'Đang quay'
    : runtime.matchSession
      ? 'Đang trong ván'
      : runtime.modal
        ? 'Đang hiển thị kết quả'
        : 'Sẵn sàng';
  const totalQuestions = bankQuestionCount(appState);
  const categoryCount = appState.categories.length;
  const disabled = runtime.spinning || runtime.modal || runtime.matchSession !== null || categoryCount === 0;
  const used = usedProgressLabel(appState);

  return `
    <div class="spin-actions">
      <button class="btn btn-spin" data-action="spin" ${disabled ? 'disabled' : ''} aria-label="Quay vòng quay lĩnh vực">
        Bắt đầu quay
      </button>
      <p class="spin-meta m-0 text-center text-caption text-muted">
        <span class="spin-meta__status">${status}</span>
        <span class="spin-meta__sep" aria-hidden="true">·</span>
        <span>${totalQuestions} câu</span>
        <span class="spin-meta__sep" aria-hidden="true">·</span>
        <span>${categoryCount} lĩnh vực</span>
        <span class="spin-meta__sep" aria-hidden="true">·</span>
        <span class="spin-meta__used" data-match-used-progress="${used.used}/${used.total}">${used.text}</span>
      </p>
    </div>
  `;
}

function renderRound2Body(appState: AppState, runtime: RuntimeState): string {
  const pool = getSpinRound2PoolPacks();
  const session = runtime.matchSession;
  const available = session
    ? getAvailableMatchExamPacks(session.round2Packs, session.usedQuestionIds)
    : pool;
  const playable = isMatchIdle(runtime, 2);
  const action = playable ? 'match-spin-round2' : 'spin-round-locked';
  const alreadyPlayedRound2 = Boolean(
    session?.round2Packs.some((pack) => isMatchExamPackUsed(pack, session.usedQuestionIds)),
  );

  const hint = playable
    ? ''
    : alreadyPlayedRound2
      ? `Đã chơi ${ROUND2} · Sang ${ROUND3}`
      : `Hoàn thành ${ROUND1} để quay`;

  if (pool.length === 0) {
    return `
      <div class="spin-round-panel">
        <p class="spin-round-empty warning-banner mb-0">
          Chưa đủ câu để tạo bộ đề ${ROUND2}.
        </p>
        <div class="spin-actions">
          <button
            type="button"
            class="btn btn-spin"
            data-action="spin-round-locked"
            data-round="2"
            aria-label="${ROUND2} chưa mở"
          >
            Quay chọn đề
          </button>
          ${hint ? `<p class="spin-hint m-0 text-center text-caption text-subtle">${hint}</p>` : ''}
        </div>
      </div>
    `;
  }

  if (alreadyPlayedRound2 && session?.currentRound === 2) {
    return `
      <div class="spin-round-panel">
        <p class="spin-round-empty warning-banner mb-0">
          Đã hoàn thành ${ROUND2}. Sang ${ROUND3}.
        </p>
        <div class="spin-actions">
          <button type="button" class="btn btn-spin" data-action="match-proceed-round3">
            Sang ${ROUND3}
          </button>
        </div>
      </div>
    `;
  }

  if (available.length === 0 && session?.currentRound === 2) {
    return `
      <div class="spin-round-panel">
        <p class="spin-round-empty warning-banner mb-0">
          Đã hỏi hết bộ đề ${ROUND2}. Sang ${ROUND3}.
        </p>
        <div class="spin-actions">
          <button type="button" class="btn btn-spin" data-action="match-proceed-round3">
            Sang ${ROUND3}
          </button>
        </div>
      </div>
    `;
  }

  const used = usedProgressLabel(appState);
  const metaParts = [
    `còn ${available.length}/${pool.length} bộ`,
    session ? `Điểm ${ROUND2}: ${formatScore(session.scores[2])}` : null,
    `<span class="spin-meta__used" data-match-used-progress="${used.used}/${used.total}">${used.text}</span>`,
  ].filter(Boolean);
  const meta = metaParts.join(' · ');

  return `
    <div class="spin-layout">
      <div class="spin-wheel-zone">
        ${WheelRenderer.renderHTML(runtime.spinning)}
      </div>
      <div class="spin-actions">
        <button
          type="button"
          class="btn btn-spin"
          data-action="${action}"
          data-round="2"
          ${runtime.spinning ? 'disabled' : ''}
          aria-label="${playable ? `Quay chọn đề ${ROUND2}` : `${ROUND2} chưa mở`}"
        >
          Quay chọn đề
        </button>
        <p class="spin-meta m-0 text-center text-caption text-muted">${meta}</p>
        ${hint ? `<p class="spin-hint m-0 text-center text-caption text-subtle">${hint}</p>` : ''}
      </div>
    </div>
  `;
}

function renderRound3Body(appState: AppState, runtime: RuntimeState): string {
  const match = appState.settings.match;
  const session = runtime.matchSession;
  const packages = match?.round3Packages ?? [];
  const playable = isMatchIdle(runtime, 3);
  const sourceMode = session?.round3SourceMode ?? 'bank';
  const selectedCategoryId = session?.round3CategoryId ?? null;
  const needsCategory = playable && sourceMode === 'category' && !selectedCategoryId;
  const action = playable && !needsCategory ? 'match-confirm-start-round3' : 'spin-round-locked';
  const questionCount = match?.round3QuestionCount ?? 0;
  const timerSec = match?.round3TimerSec ?? 30;
  const quotas = match ? buildRound3PackageQuotas(match) : {};
  const sortedPackages = [...packages].sort((a, b) => a.points - b.points);

  const packageCards = sortedPackages
    .map((pkg, index) => {
      const isDefault = pkg.id === match?.round3DefaultPackageId;
      const quota = quotas[pkg.id];
      const tier = index === sortedPackages.length - 1 ? 'high' : index === 0 ? 'low' : 'mid';
      const meta = isDefault ? 'Không giới hạn' : `${quota ?? 0} lần / ván`;
      return `
        <article class="r3-stake r3-stake--${tier}${isDefault ? ' r3-stake--default' : ''}" aria-hidden="true">
          <p class="r3-stake__points">+${pkg.points}</p>
          <p class="r3-stake__unit">điểm</p>
          <p class="r3-stake__window">${pkg.timerSec}s giữ điểm</p>
          <p class="r3-stake__meta">${meta}</p>
        </article>`;
    })
    .join('');

  const sourceLocked = !playable;
  const categoryButtons = appState.categories
    .map((category) => {
      const selected = category.id === selectedCategoryId;
      return `
        <button
          type="button"
          class="r3-field${selected ? ' r3-field--selected' : ''}"
          data-action="match-round3-category"
          data-category-id="${escapeHtml(category.id)}"
          ${sourceLocked ? 'disabled' : ''}
          style="--cat-color:${escapeHtml(category.color)}"
        >
          <span class="r3-field__name">${escapeHtml(category.name)}</span>
          <span class="r3-field__count">${category.questions.length}</span>
        </button>`;
    })
    .join('');

  const readyHint = !playable
    ? `Hoàn thành ${ROUND1} và ${ROUND2} để mở`
    : sourceMode === 'category' && !selectedCategoryId
      ? 'Chọn một lĩnh vực'
      : '';
  const used = usedProgressLabel(appState);

  return `
    <div class="spin-round-panel r3-lobby">
      <header class="r3-hero">
        <p class="r3-hero__eyebrow">Màn cuối</p>
        <h2 class="r3-hero__title">${ROUND3}</h2>
        <div class="r3-hero__stats" aria-label="Thông số màn">
          <span><strong>${questionCount}</strong> câu</span>
          <span class="r3-hero__dot" aria-hidden="true"></span>
          <span><strong>${timerSec}s</strong> / câu</span>
        </div>
      </header>

      <section class="r3-block" aria-label="Nguồn câu">
        <p class="r3-block__label">Nguồn đề</p>
        <div class="r3-source" role="group">
          <button
            type="button"
            class="r3-source__btn${sourceMode === 'bank' ? ' r3-source__btn--active' : ''}"
            data-action="match-round3-source"
            data-mode="bank"
            ${sourceLocked ? 'disabled' : ''}
          >
            <span class="r3-source__title">Toàn ngân hàng</span>
          </button>
          <button
            type="button"
            class="r3-source__btn${sourceMode === 'category' ? ' r3-source__btn--active' : ''}"
            data-action="match-round3-source"
            data-mode="category"
            ${sourceLocked ? 'disabled' : ''}
          >
            <span class="r3-source__title">Một lĩnh vực</span>
          </button>
        </div>
        ${
          sourceMode === 'category'
            ? `<div class="r3-fields" role="group" aria-label="Chọn lĩnh vực">
                ${categoryButtons || '<p class="r3-empty">Chưa có lĩnh vực trong Ngân hàng.</p>'}
              </div>`
            : ''
        }
      </section>

      <section class="r3-block" aria-label="Gói điểm">
        <p class="r3-block__label">Thang điểm</p>
        <div class="r3-stakes">
          ${packageCards || '<p class="r3-empty">Chưa có gói điểm trong Cài đặt.</p>'}
        </div>
      </section>

      <div class="spin-actions r3-actions">
        <button
          type="button"
          class="btn btn-spin"
          data-action="${action}"
          data-round="3"
          ${runtime.spinning || needsCategory ? 'disabled' : ''}
          aria-label="${playable ? `Bắt đầu ${ROUND3}` : `${ROUND3} chưa mở`}"
        >
          ${playable ? 'Xác nhận – Bắt đầu' : `Bắt đầu ${ROUND3}`}
        </button>
        <p class="spin-meta m-0 text-center text-caption text-muted">
          <span class="spin-meta__used" data-match-used-progress="${used.used}/${used.total}">${used.text}</span>
        </p>
        ${readyHint ? `<p class="spin-hint m-0 text-center text-caption text-subtle">${escapeHtml(readyHint)}</p>` : ''}
      </div>
    </div>
  `;
}

export function renderSpinTab(appState: AppState, runtime: RuntimeState): string {
  const view = runtime.spinRoundView;
  const matchRound = runtime.matchSession?.currentRound ?? null;

  let body = '';
  if (view === 1) {
    const emptyBank =
      appState.categories.length === 0
        ? '<div class="warning-banner mb-4">Hãy thêm ít nhất 1 lĩnh vực trong Ngân hàng trước khi quay.</div>'
        : '';
    body = `
      ${emptyBank}
      <div class="spin-layout">
        <div class="spin-wheel-zone">${WheelRenderer.renderHTML(runtime.spinning)}</div>
        ${renderRound1Actions(appState, runtime)}
      </div>
    `;
  } else if (view === 2) {
    body = renderRound2Body(appState, runtime);
  } else {
    body = renderRound3Body(appState, runtime);
  }

  return `
    <section class="panel panel--spin" data-swipe-zone="content">
      <div class="spin-page">
        ${renderSpinRoundTabs(view, matchRound)}
        ${body}
      </div>
    </section>
  `;
}
