import type { RuntimeState } from '../../core/state';
import type { AppState } from '../../types';
import { DEFAULT_SOUND_FILE_NAMES } from '../../config/sounds';
import { rewardItemsToText, SOUND_EVENT_LABELS } from '../../data';
import type { SettingsSection, SoundEventKey } from '../../types';

const SOUND_EVENTS: SoundEventKey[] = ['correct', 'wrong', 'timeup', 'countdown', 'spin', 'tick', 'fanfare', 'click'];

const SIDEBAR_ITEMS: Array<{ id: SettingsSection; label: string; icon: string; danger?: boolean }> = [
  { id: 'timer', label: 'Thời gian', icon: '⏱' },
  { id: 'sound', label: 'Âm thanh', icon: '🔊' },
  { id: 'gifts', label: 'Quà tặng', icon: '🎁' },
  { id: 'punishments', label: 'Hình phạt', icon: '🔥' },
  { id: 'danger', label: 'Xóa dữ liệu', icon: '🗑', danger: true },
];

function renderSidebar(active: SettingsSection): string {
  const mainItems = SIDEBAR_ITEMS.filter((item) => !item.danger);
  const dangerItem = SIDEBAR_ITEMS.find((item) => item.danger);

  const item = (entry: (typeof SIDEBAR_ITEMS)[number]) => {
    const isActive =
      entry.id === active ||
      (entry.id === 'gifts' && active === 'punishments') ||
      (entry.id === 'punishments' && active === 'gifts');
    const classes = [
      'settings-sidebar__item',
      isActive ? 'settings-sidebar__item--active' : '',
      entry.danger ? 'settings-sidebar__item--danger' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return `
      <button
        type="button"
        class="${classes}"
        data-action="settings-section"
        data-section="${entry.id}"
      >
        <span class="settings-sidebar__icon" aria-hidden="true">${entry.icon}</span>
        <span>${entry.label}</span>
      </button>
    `;
  };

  return `
    <nav class="settings-sidebar" aria-label="Mục cài đặt">
      ${mainItems.map(item).join('')}
      <div class="settings-sidebar__spacer" aria-hidden="true"></div>
      ${dangerItem ? item(dangerItem) : ''}
    </nav>
  `;
}

function renderStatBar(appState: AppState, runtime: RuntimeState): string {
  const categoryCount = appState.categories.length;
  const totalQuestions = appState.categories.reduce((count, category) => count + category.questions.length, 0);
  const usedCount = runtime.usedQuestionIds.size;

  return `
    <div class="settings-stats">
      <div class="settings-stat-box">
        <p class="settings-stat-box__label">Lĩnh vực</p>
        <p class="settings-stat-box__value">${categoryCount}</p>
      </div>
      <div class="settings-stat-box">
        <p class="settings-stat-box__label">Tổng câu</p>
        <p class="settings-stat-box__value">${totalQuestions}</p>
      </div>
      <div class="settings-stat-box">
        <p class="settings-stat-box__label">Đã dùng</p>
        <p class="settings-stat-box__value settings-stat-box__value--accent">${usedCount}</p>
      </div>
    </div>
  `;
}

function renderSoundEvents(appState: AppState): string {
  const library = appState.settings.sounds?.library ?? [];
  const bindings = appState.settings.sounds?.bindings ?? {};

  return SOUND_EVENTS.map((eventKey) => {
    const boundId = bindings[eventKey];
    const boundSound = boundId ? library.find((item) => item.id === boundId) : null;
    const fileLabel = boundSound ? `Tùy chỉnh: ${boundSound.name}` : DEFAULT_SOUND_FILE_NAMES[eventKey];

    return `
      <div class="settings-sound-row">
        <div class="settings-sound-row__info">
          <span class="settings-sound-row__label">${SOUND_EVENT_LABELS[eventKey]}</span>
          <span class="settings-sound-row__meta">${fileLabel}</span>
        </div>
        <div class="settings-sound-row__actions">
          <button type="button" class="btn btn-xs btn-ghost" data-action="preview-sound" data-sound-event="${eventKey}">
            Nghe thử
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderTimerPanel(appState: AppState): string {
  return `
    <div class="settings-panel-card">
      <p class="settings-panel-card__title"><span aria-hidden="true">⏱</span>Thời gian đếm ngược mỗi câu</p>
      <div class="settings-timer-slider">
        <span class="settings-timer-slider__edge">10s</span>
        <input id="timer-slider" type="range" min="10" max="60" value="${appState.settings.timer}" />
        <span class="settings-timer-slider__edge">60s</span>
      </div>
      <div class="settings-timer-value">
        <span class="settings-timer-value__number" id="timer-slider-value">${appState.settings.timer}</span>
        <span class="settings-timer-value__unit">giây</span>
      </div>
    </div>
  `;
}

function renderSoundPanel(appState: AppState): string {
  return `
    <div class="settings-panel-card">
      <div class="settings-panel-card__head">
        <p class="settings-panel-card__title settings-panel-card__title--inline"><span aria-hidden="true">🔊</span>Âm thanh toàn bộ</p>
        <label class="settings-toggle">
          <input id="sound-toggle" type="checkbox" ${appState.settings.sound ? 'checked' : ''} />
          <span class="settings-toggle__track" aria-hidden="true"></span>
        </label>
      </div>
      <p class="settings-sound-note muted">Âm thanh mặc định trong <code>public/sounds/</code>. Tùy chỉnh upload sẽ bổ sung sau.</p>
      <div class="settings-sound-list">${renderSoundEvents(appState)}</div>
    </div>
  `;
}

function renderRewardsPanel(appState: AppState, section: SettingsSection): string {
  const giftsActive = section === 'gifts';
  const punishmentsActive = section === 'punishments';

  return `
    <div class="settings-rewards-grid">
      <div class="settings-panel-card ${giftsActive ? 'settings-panel-card--focus' : ''}">
        <p class="settings-panel-card__title"><span aria-hidden="true">🎁</span>Quà tặng</p>
        <textarea
          class="textarea settings-textarea-compact"
          id="gifts-input"
          placeholder="Mỗi dòng = 1 phần quà"
        >${rewardItemsToText(appState.settings.gifts)}</textarea>
      </div>
      <div class="settings-panel-card ${punishmentsActive ? 'settings-panel-card--focus' : ''}">
        <p class="settings-panel-card__title"><span aria-hidden="true">🔥</span>Hình phạt</p>
        <textarea
          class="textarea settings-textarea-compact"
          id="punishments-input"
          placeholder="Mỗi dòng = 1 hình phạt"
        >${rewardItemsToText(appState.settings.punishments)}</textarea>
      </div>
    </div>
  `;
}

function renderDangerPanel(): string {
  return `
    <div class="settings-panel-card settings-panel-card--danger">
      <p class="settings-panel-card__title"><span aria-hidden="true">🗑</span>Xóa toàn bộ dữ liệu</p>
      <p class="settings-danger-copy">
        Xóa sạch toàn bộ lĩnh vực, câu hỏi, lịch sử trả lời và đưa app về dữ liệu mẫu. Hành động này không thể hoàn tác.
      </p>
      <button type="button" class="btn btn-danger" data-action="clear-all">Xóa sạch toàn bộ kho câu hỏi</button>
    </div>
  `;
}

function renderContentPanel(appState: AppState, section: SettingsSection): string {
  if (section === 'timer') {
    return renderTimerPanel(appState);
  }
  if (section === 'sound') {
    return renderSoundPanel(appState);
  }
  if (section === 'gifts' || section === 'punishments') {
    return renderRewardsPanel(appState, section);
  }
  return renderDangerPanel();
}

export function renderSettingsTab(appState: AppState, runtime: RuntimeState): string {
  const section = runtime.settingsSection;

  return `
    <section class="panel panel--settings">
      <div class="settings-layout">
        ${renderSidebar(section)}
        <div class="settings-main">
          ${renderStatBar(appState, runtime)}
          <div class="settings-content">${renderContentPanel(appState, section)}</div>
        </div>
      </div>
    </section>
  `;
}
