import { DEFAULTS } from '../../config';
import { formatTimerDisplay } from '../../utils/timer-format';
import type { RuntimeState } from '../../core/state';
import type { AppState } from '../../types';
import { DEFAULT_SOUND_FILE_NAMES, SOUND_EVENT_GROUPS } from '../../config/sounds';
import { rewardItemsToText, SOUND_EVENT_LABELS } from '../../data';
import type { SettingsSection, SoundEventKey } from '../../types';

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

function renderSoundEventRow(
  appState: AppState,
  runtime: RuntimeState,
  eventKey: SoundEventKey,
): string {
  const library = appState.settings.sounds?.library ?? [];
  const bindings = appState.settings.sounds?.bindings ?? {};
  const draft = runtime.soundUploadDraft;
  const isPending = draft?.eventKey === eventKey;
  const boundId = bindings[eventKey];
  const boundSound = boundId ? library.find((item) => item.id === boundId) : null;
  const hasCustom = Boolean(boundSound);

  let fileLabel: string;
  if (isPending) {
    fileLabel = `Chờ lưu: ${draft!.name}`;
  } else if (boundSound) {
    fileLabel = `Tùy chỉnh: ${boundSound.name}`;
  } else {
    fileLabel = `Mặc định: ${DEFAULT_SOUND_FILE_NAMES[eventKey]}`;
  }

  const pendingActions = isPending
    ? `
        <button type="button" class="btn btn--small btn-accent" data-action="confirm-sound" data-sound-event="${eventKey}">Lưu</button>
        <button type="button" class="btn btn--small btn-ghost" data-action="cancel-sound" data-sound-event="${eventKey}">Hủy</button>
        <button type="button" class="btn btn--small btn-ghost" data-action="preview-sound" data-sound-event="${eventKey}">Nghe lại</button>
      `
    : `
        <label class="btn btn--small btn-ghost sound-upload-label">
          Chọn file
          <input
            type="file"
            class="sound-upload-input"
            accept="audio/*,.mp3,.wav,.ogg"
            data-action="pick-sound"
            data-sound-event="${eventKey}"
          />
        </label>
        <button type="button" class="btn btn--small btn-ghost" data-action="preview-sound" data-sound-event="${eventKey}">Nghe thử</button>
        ${
          hasCustom
            ? `<button type="button" class="btn btn--small btn-ghost" data-action="clear-sound" data-sound-event="${eventKey}">Xóa tùy chỉnh</button>`
            : ''
        }
      `;

  return `
    <div class="sound-event-row ${isPending ? 'sound-event-row--pending' : ''}">
      <div class="sound-event-row__info">
        <strong>${SOUND_EVENT_LABELS[eventKey]}</strong>
        <span class="sound-event-row__name">${fileLabel}</span>
      </div>
      <div class="sound-event-row__actions">${pendingActions}</div>
    </div>
  `;
}

function renderSoundEvents(appState: AppState, runtime: RuntimeState): string {
  return SOUND_EVENT_GROUPS.map(
    (group) => `
      <div class="settings-sound-group">
        <p class="settings-sound-group__title">${group.title}</p>
        <div class="sound-events">
          ${group.keys.map((eventKey) => renderSoundEventRow(appState, runtime, eventKey)).join('')}
        </div>
      </div>
    `,
  ).join('');
}

function renderTimerPanel(appState: AppState): string {
  const { value, unit } = formatTimerDisplay(appState.settings.timer);

  return `
    <div class="settings-panel-card">
      <p class="settings-panel-card__title"><span aria-hidden="true">⏱</span>Thời gian đếm ngược mỗi câu</p>
      <div class="settings-timer-slider">
        <span class="settings-timer-slider__edge">${DEFAULTS.timerMinSec}s</span>
        <input id="timer-slider" type="range" min="${DEFAULTS.timerMinSec}" max="${DEFAULTS.timerMaxSec}" value="${appState.settings.timer}" />
        <span class="settings-timer-slider__edge">5 phút</span>
      </div>
      <div class="settings-timer-value">
        <span class="settings-timer-value__number" id="timer-slider-value">${value}</span>
        <span class="settings-timer-value__unit" id="timer-slider-unit">${unit}</span>
      </div>
    </div>
  `;
}

function renderSoundPanel(appState: AppState, runtime: RuntimeState): string {
  return `
    <div class="settings-panel-card">
      <div class="settings-panel-card__head">
        <p class="settings-panel-card__title settings-panel-card__title--inline"><span aria-hidden="true">🔊</span>Âm thanh</p>
        <label class="settings-toggle">
          <input id="sound-toggle" type="checkbox" ${appState.settings.sound ? 'checked' : ''} />
          <span class="settings-toggle__track" aria-hidden="true"></span>
        </label>
      </div>
      <p class="settings-sound-note muted">
        Upload file <strong>.mp3 / .wav / .ogg</strong> (tối đa 2MB). Chọn file để nghe thử trước, sau đó bấm <strong>Lưu</strong> để gán.
        Mặc định nằm trong <code>public/sounds/</code>.
      </p>
      ${renderSoundEvents(appState, runtime)}
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

function renderContentPanel(appState: AppState, runtime: RuntimeState, section: SettingsSection): string {
  if (section === 'timer') {
    return renderTimerPanel(appState);
  }
  if (section === 'sound') {
    return renderSoundPanel(appState, runtime);
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
          <div class="settings-content">${renderContentPanel(appState, runtime, section)}</div>
        </div>
      </div>
    </section>
  `;
}
