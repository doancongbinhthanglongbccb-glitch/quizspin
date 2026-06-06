import type { AppState } from '../../types';
import type { RuntimeState } from '../../core/state';
import { summarizeAnswerRecord } from '../../data';
import { escapeHtml } from '../../utils/html';
import { WheelRenderer } from './wheel';

function renderAnswerHistory(appState: AppState): string {
  const recent = appState.answerHistory.slice(0, 8);
  if (!recent.length) {
    return '<li class="history-empty">Chưa có lượt trả lời</li>';
  }

  return recent
    .map((record) => {
      const { label, timeLabel } = summarizeAnswerRecord(appState, record);
      const statusClass = record.isCorrect ? 'answer-history-item__status--correct' : 'answer-history-item__status--wrong';
      const statusText = record.isCorrect ? 'Đúng' : 'Sai';

      return `
        <li class="answer-history-item">
          <span class="answer-history-item__status ${statusClass}">${statusText}</span>
          <span class="answer-history-item__question">${escapeHtml(label)}</span>
          <span class="answer-history-item__meta">${timeLabel}</span>
        </li>
      `;
    })
    .join('');
}

export function renderSpinTab(appState: AppState, runtime: RuntimeState): string {
  const status = runtime.spinning ? 'Đang quay' : runtime.modal ? 'Đang hiển thị kết quả' : 'Sẵn sàng';
  const rewardReady = appState.settings.gifts.length > 0 && appState.settings.punishments.length > 0;
  const totalQuestions = appState.categories.reduce((count, category) => count + category.questions.length, 0);
  const recent = runtime.spinHistory.length
    ? runtime.spinHistory
        .map((entry) => `<li><span class="history-dot" style="background:${entry.color}"></span><span class="history-label">${entry.label}</span></li>`)
        .join('')
    : '<li class="history-empty">Chưa có lượt quay</li>';

  const spinDisabled = runtime.spinning || runtime.modal || !rewardReady;

  return `
    <section class="panel panel--hero panel--spin" data-swipe-zone="content">
      ${rewardReady ? '' : '<div class="warning-banner">Hãy thêm ít nhất 1 Quà tặng và 1 Hình phạt trong Cài đặt trước khi quay.</div>'}
      <div class="spin-layout">
        <div class="spin-layout__wheel">
          <div class="spin-wheel-zone">
            ${WheelRenderer.renderHTML()}
          </div>
          <div class="spin-actions">
            <button class="btn btn-spin" data-action="spin" ${spinDisabled ? 'disabled' : ''} aria-label="Quay vòng quay ngay">
              QUAY NGAY
            </button>
            <p class="spin-hint muted">Vuốt trái/phải để đổi tab</p>
          </div>
        </div>

        <aside class="spin-layout__side stacked-card" aria-label="Thông tin lượt quay">
          <div class="spin-stats">
            <div class="spin-stat">
              <span class="spin-stat__label">Trạng thái</span>
              <span class="status-pill status-pill--live">${status}</span>
            </div>
            <div class="spin-stat">
              <span class="spin-stat__label">Kho câu</span>
              <span class="mini-pill">${totalQuestions} câu</span>
            </div>
          </div>

          <div class="spin-side-block">
            <div class="stacked-card__title">Lịch sử quay</div>
            <ul class="history-list history-list--scroll" data-scroll-restore="spin-history">${recent}</ul>
          </div>

          <div class="spin-side-block">
            <div class="stacked-card__title">Lịch sử trả lời</div>
            <ul class="answer-history-list history-list--scroll" data-scroll-restore="answer-history">${renderAnswerHistory(appState)}</ul>
          </div>
        </aside>
      </div>
    </section>
  `;
}
