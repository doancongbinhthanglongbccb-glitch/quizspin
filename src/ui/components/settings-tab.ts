import { DEFAULTS } from '../../config';
import { formatTimerDisplay } from '../../utils/timer-format';
import type { RuntimeState } from '../../core/state';
import type { AppState } from '../../types';
import { DEFAULT_SOUND_FILE_NAMES, SOUND_EVENT_GROUPS } from '../../config/sounds';
import { DEFAULT_INTRO_LINK_LABEL, rewardItemsToText, SOUND_EVENT_LABELS } from '../../data';
import { escapeHtml } from '../../utils/html';
import type { SettingsSection, SoundEventKey } from '../../types';

const SIDEBAR_ITEMS: Array<{ id: SettingsSection; label: string; icon: string; danger?: boolean }> = [
  { id: 'timer', label: 'Thời gian', icon: '⏱' },
  { id: 'sound', label: 'Âm thanh', icon: '🔊' },
  { id: 'gifts', label: 'Quà tặng', icon: '🎁' },
  { id: 'punishments', label: 'Hình phạt', icon: '🔥' },
  { id: 'intro', label: 'Màn Intro', icon: '🎬' },
  { id: 'danger', label: 'Xóa dữ liệu', icon: '🗑', danger: true },
];

function renderSidebar(active: SettingsSection): string {
  const mainItems = SIDEBAR_ITEMS.filter((item) => !item.danger);
  const dangerItem = SIDEBAR_ITEMS.find((item) => item.danger);

  const item = (entry: (typeof SIDEBAR_ITEMS)[number]) => {
    const isActive = entry.id === active;
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
        <span class="settings-sidebar__icon shrink-0 text-[1.1rem] leading-none" aria-hidden="true">${entry.icon}</span>
        <span>${entry.label}</span>
      </button>
    `;
  };

  return `
    <nav class="settings-sidebar flex w-full shrink-0 flex-col gap-1 max-lg:flex-row max-lg:flex-nowrap max-lg:overflow-x-auto max-lg:touch-pan-x max-lg:overscroll-x-contain max-lg:pb-1 max-lg:[-webkit-overflow-scrolling:touch] max-md:flex-wrap max-md:gap-1.5 lg:w-[188px] lg:flex-col lg:overflow-visible lg:pb-0" aria-label="Mục cài đặt">
      ${mainItems.map(item).join('')}
      <div class="settings-sidebar__spacer min-h-10 flex-1 max-lg:hidden" aria-hidden="true"></div>
      ${dangerItem ? item(dangerItem) : ''}
    </nav>
  `;
}

function renderStatBar(appState: AppState, runtime: RuntimeState): string {
  const categoryCount = appState.categories.length;
  const totalQuestions = appState.categories.reduce((count, category) => count + category.questions.length, 0);
  const usedCount = runtime.usedQuestionIds.size;

  return `
    <div class="settings-stats flex gap-2.5 max-md:flex-col max-lg:grid max-lg:grid-cols-3 lg:flex lg:flex-row">
      <div class="settings-stat-box flex-1 rounded-lg border border-white/[0.08] bg-white/5 px-4 py-3.5 text-center">
        <p class="settings-stat-box__label m-0 mb-1 text-caption text-white/45">Lĩnh vực</p>
        <p class="settings-stat-box__value m-0 text-display font-bold text-white">${categoryCount}</p>
      </div>
      <div class="settings-stat-box flex-1 rounded-lg border border-white/[0.08] bg-white/5 px-4 py-3.5 text-center">
        <p class="settings-stat-box__label m-0 mb-1 text-caption text-white/45">Tổng câu</p>
        <p class="settings-stat-box__value m-0 text-display font-bold text-white">${totalQuestions}</p>
      </div>
      <div class="settings-stat-box flex-1 rounded-lg border border-white/[0.08] bg-white/5 px-4 py-3.5 text-center">
        <p class="settings-stat-box__label m-0 mb-1 text-caption text-white/45">Đã dùng</p>
        <p class="settings-stat-box__value settings-stat-box__value--accent m-0 text-display font-bold text-[#afa9ec]">${usedCount}</p>
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
        <label class="btn btn--small btn-ghost sound-upload-label m-0 cursor-pointer">
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
    <div class="sound-event-row flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3 max-lg:flex-col max-lg:items-stretch max-md:flex-col max-md:items-stretch xl:landscape:flex-row xl:landscape:items-center ${isPending ? 'sound-event-row--pending' : ''}">
      <div class="sound-event-row__info grid min-w-0 gap-1">
        <strong class="text-subtitle">${SOUND_EVENT_LABELS[eventKey]}</strong>
        <span class="sound-event-row__name truncate text-caption text-subtle">${fileLabel}</span>
      </div>
      <div class="sound-event-row__actions flex flex-wrap justify-end gap-2 max-lg:justify-start max-md:justify-stretch max-md:[&_.btn]:flex-1">${pendingActions}</div>
    </div>
  `;
}

function renderSoundEvents(appState: AppState, runtime: RuntimeState): string {
  return SOUND_EVENT_GROUPS.map(
    (group) => `
      <div class="settings-sound-group grid gap-2.5 [&+&]:mt-[18px]">
        <p class="settings-sound-group__title m-0 text-caption font-extrabold uppercase tracking-widest text-violet-300/85">${group.title}</p>
        <div class="sound-events grid gap-3 mt-3 xl:landscape:grid-cols-2">
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
      <div class="settings-timer-slider flex items-center gap-3 mb-2.5">
        <span class="settings-timer-slider__edge shrink-0 text-caption text-white/45">${DEFAULTS.timerMinSec}s</span>
        <input id="timer-slider" class="flex-1" type="range" min="${DEFAULTS.timerMinSec}" max="${DEFAULTS.timerMaxSec}" value="${appState.settings.timer}" />
        <span class="settings-timer-slider__edge shrink-0 text-caption text-white/45">5 phút</span>
      </div>
      <div class="settings-timer-value text-center">
        <span class="settings-timer-value__number text-[clamp(1.75rem,4vw,2rem)] font-bold text-white" id="timer-slider-value">${value}</span>
        <span class="settings-timer-value__unit text-ui text-white/45" id="timer-slider-unit">${unit}</span>
      </div>
    </div>
  `;
}

function renderSoundPanel(appState: AppState, runtime: RuntimeState): string {
  return `
    <div class="settings-panel-card">
      <div class="settings-panel-card__head flex items-center justify-between gap-3 mb-2.5">
        <p class="settings-panel-card__title settings-panel-card__title--inline m-0 flex items-center gap-2"><span aria-hidden="true">🔊</span>Âm thanh</p>
        <label class="settings-toggle inline-flex shrink-0 cursor-pointer">
          <input id="sound-toggle" type="checkbox" class="absolute h-0 w-0 opacity-0" ${appState.settings.sound ? 'checked' : ''} />
          <span class="settings-toggle__track" aria-hidden="true"></span>
        </label>
      </div>
      <p class="settings-sound-note mb-3.5 text-caption leading-relaxed text-slate-300/90">
        Upload file <strong>.mp3 / .wav / .ogg</strong> (tối đa 2MB). Chọn file để nghe thử trước, sau đó bấm <strong>Lưu</strong> để gán.
        Mặc định nằm trong <code class="text-caption text-violet-300/95">public/sounds/</code>.
      </p>
      ${renderSoundEvents(appState, runtime)}
    </div>
  `;
}

function renderRewardsPanel(appState: AppState, runtime: RuntimeState, section: SettingsSection): string {
  const giftsActive = section === 'gifts';
  const punishmentsActive = section === 'punishments';
  const giftsText = runtime.settingsDraft?.gifts ?? rewardItemsToText(appState.settings.gifts);
  const punishmentsText = runtime.settingsDraft?.punishments ?? rewardItemsToText(appState.settings.punishments);

  return `
    <div class="settings-rewards-grid grid grid-cols-1 gap-3 max-lg:grid-cols-1 lg:landscape:grid-cols-2">
      <div class="settings-panel-card ${giftsActive ? 'settings-panel-card--focus' : ''}">
        <p class="settings-panel-card__title"><span aria-hidden="true">🎁</span>Quà tặng</p>
        <textarea
          class="textarea settings-textarea-compact"
          id="gifts-input"
          placeholder="Mỗi dòng = 1 phần quà"
        >${escapeHtml(giftsText)}</textarea>
      </div>
      <div class="settings-panel-card ${punishmentsActive ? 'settings-panel-card--focus' : ''}">
        <p class="settings-panel-card__title"><span aria-hidden="true">🔥</span>Hình phạt</p>
        <textarea
          class="textarea settings-textarea-compact"
          id="punishments-input"
          placeholder="Mỗi dòng = 1 hình phạt"
        >${escapeHtml(punishmentsText)}</textarea>
      </div>
    </div>
  `;
}

function renderIntroPanel(appState: AppState, runtime: RuntimeState): string {
  const label = runtime.settingsDraft?.introLabel ?? appState.settings.introLink.label;
  const url = runtime.settingsDraft?.introUrl ?? appState.settings.introLink.url;

  return `
    <div class="settings-panel-card">
      <p class="settings-panel-card__title"><span aria-hidden="true">🎬</span>Nút liên kết màn Intro</p>
      <p class="settings-danger-copy mb-3.5 text-caption leading-normal text-white/55">
        Nút thứ hai trên màn Intro (bên cạnh «Vòng xoay kiến thức»). Chỉ hiện khi đã nhập đường dẫn hợp lệ (<code class="text-caption text-violet-300/95">https://...</code>).
      </p>
      <label class="bank-form-label" for="intro-link-label-input">Tên nút</label>
      <input
        id="intro-link-label-input"
        class="input mb-3"
        type="text"
        data-settings-field="intro-link-label"
        placeholder="${DEFAULT_INTRO_LINK_LABEL}"
        value="${escapeHtml(label)}"
      />
      <label class="bank-form-label" for="intro-link-url-input">Đường dẫn (URL)</label>
      <input
        id="intro-link-url-input"
        class="input"
        type="url"
        inputmode="url"
        data-settings-field="intro-link-url"
        placeholder="https://example.com/kiem-tra"
        value="${escapeHtml(url)}"
      />
    </div>
  `;
}

function renderDangerPanel(): string {
  return `
    <div class="settings-panel-card settings-panel-card--danger">
      <p class="settings-panel-card__title"><span aria-hidden="true">🗑</span>Xóa toàn bộ dữ liệu</p>
      <p class="settings-danger-copy mb-3.5 text-caption leading-normal text-white/55">
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
    return renderRewardsPanel(appState, runtime, section);
  }
  if (section === 'intro') {
    return renderIntroPanel(appState, runtime);
  }
  return renderDangerPanel();
}

export function renderSettingsTab(appState: AppState, runtime: RuntimeState): string {
  const section = runtime.settingsSection;

  return `
    <section class="panel panel--settings p-[18px]">
      <div class="settings-layout flex items-stretch gap-3.5 max-lg:flex-col lg:flex-row">
        ${renderSidebar(section)}
        <div class="settings-main flex min-w-0 flex-1 flex-col gap-3">
          ${renderStatBar(appState, runtime)}
          <div class="settings-content">${renderContentPanel(appState, runtime, section)}</div>
        </div>
      </div>
    </section>
  `;
}
