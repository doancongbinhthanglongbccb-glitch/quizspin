import type { AppState } from '../../types';
import type { RuntimeState } from '../../core/state';
import { describeAnswerRecord } from '../../data';
import { escapeHtml } from '../../utils/html';
import { WheelRenderer } from './wheel';

function renderAnswerHistoryPanel(appState: AppState): string {
  const recent = appState.answerHistory.slice(0, 12);
  const count = recent.length;

  if (!count) {
    return `
      <details class="answer-history-panel">
        <summary class="answer-history-panel__summary">
          <span class="answer-history-panel__title">Lịch sử gần đây</span>
          <span class="answer-history-panel__count">0</span>
        </summary>
        <div class="answer-history-empty">
          <span class="answer-history-empty__icon" aria-hidden="true">📝</span>
          <p class="answer-history-empty__title">Chưa có lượt trả lời</p>
          <p class="answer-history-empty__hint">Quay vòng và trả lời câu hỏi — kết quả sẽ hiện ở đây.</p>
        </div>
      </details>
    `;
  }

  const items = recent
    .map((record) => {
      const { questionLabel, playerAnswer, correctAnswer, timeLabel } = describeAnswerRecord(appState, record);
      const statusClass = record.isCorrect
        ? 'answer-history-card__badge--correct'
        : 'answer-history-card__badge--wrong';
      const statusIcon = record.isCorrect ? '✓' : '✗';
      const statusText = record.isCorrect ? 'Đúng' : 'Sai';

      return `
        <button
          type="button"
          class="answer-history-card"
          data-action="view-answer-record"
          data-record-at="${record.submittedAt}"
        >
          <div class="answer-history-card__head">
            <span class="answer-history-card__badge ${statusClass}">${statusIcon} ${statusText}</span>
            <span class="answer-history-card__time">${timeLabel}</span>
          </div>
          <p class="answer-history-card__question">${escapeHtml(questionLabel)}</p>
          <div class="answer-history-card__answers">
            <span class="answer-history-card__line">
              <span class="answer-history-card__label">Bạn:</span>
              <span class="answer-history-card__value">${escapeHtml(playerAnswer)}</span>
            </span>
            <span class="answer-history-card__line">
              <span class="answer-history-card__label">Đúng:</span>
              <span class="answer-history-card__value">${escapeHtml(correctAnswer)}</span>
            </span>
          </div>
        </button>
      `;
    })
    .join('');

  return `
    <details class="answer-history-panel" open>
      <summary class="answer-history-panel__summary">
        <span class="answer-history-panel__title">Lịch sử gần đây</span>
        <span class="answer-history-panel__count">${count}</span>
      </summary>
      <div class="answer-history-panel__list" data-scroll-restore="answer-history">${items}</div>
    </details>
  `;
}

export function renderSpinTab(appState: AppState, runtime: RuntimeState): string {
  const status = runtime.spinning ? 'Đang quay' : runtime.modal ? 'Đang hiển thị kết quả' : 'Sẵn sàng';
  const rewardReady = appState.settings.gifts.length > 0 && appState.settings.punishments.length > 0;
  const totalQuestions = appState.categories.reduce((count, category) => count + category.questions.length, 0);
  const categoryCount = appState.categories.length;

  const spinDisabled = runtime.spinning || runtime.modal || !rewardReady;

  return `
    <section class="panel panel--hero panel--spin" data-swipe-zone="content">
      ${rewardReady ? '' : '<div class="warning-banner">Hãy thêm ít nhất 1 Quà tặng và 1 Hình phạt trong Cài đặt trước khi quay.</div>'}
      <div class="spin-page">
        <div class="spin-layout">
          <div class="spin-layout__wheel">
            <div class="spin-wheel-zone">
              ${WheelRenderer.renderHTML()}
            </div>
            <div class="spin-actions">
              <button class="btn btn-spin" data-action="spin" ${spinDisabled ? 'disabled' : ''} aria-label="Quay vòng quay ngay">
                BẮT ĐẦU QUAY
              </button>
              <p class="spin-hint muted">Vuốt trái/phải để đổi tab</p>
            </div>
          </div>

          <aside class="spin-layout__side stacked-card" aria-label="Thông tin lượt quay">
            <div class="spin-stats">
              <div class="spin-stat">
                <span class="spin-stat__label">Trạng thái</span>
                <span class="status-pill status-pill--live spin-stat__value">${status}</span>
              </div>
              <div class="spin-stat">
                <span class="spin-stat__label">Kho câu hỏi</span>
                <span class="mini-pill spin-stat__value">${totalQuestions} câu</span>
              </div>
              <div class="spin-stat">
                <span class="spin-stat__label">Lĩnh vực</span>
                <span class="mini-pill spin-stat__value">${categoryCount} mục</span>
              </div>
            </div>
          </aside>

          <div class="spin-layout__history">
            ${renderAnswerHistoryPanel(appState)}
          </div>
        </div>
      </div>
    </section>
  `;
}
