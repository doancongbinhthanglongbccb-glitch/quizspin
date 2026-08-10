import { DEFAULTS, TIMER_PRESETS } from '../../config';
import { defaultMatchSettings, matchTheoreticalMaxScore } from '../../config/match';
import { formatTimerDisplay } from '../../utils/timer-format';
import { timerMinutesInputValue } from '../../utils/timer-settings';
import type { RuntimeState } from '../../core/state';
import type { AppState, IntroLinkSettings, SettingsSection, SoundEventKey } from '../../types';
import { DEFAULT_SOUND_FILE_NAMES, SOUND_EVENT_GROUPS } from '../../config/sounds';
import { DEFAULT_INTRO_LINK_LABEL, isMcqQuestion, rewardItemsToText, SOUND_EVENT_LABELS } from '../../data';
import { MAX_INTRO_LINKS } from '../../types';
import { escapeHtml } from '../../utils/html';
import { appContext } from '../../core/state';
import { countUsedInCategory } from '../../core/pool-manager';

const SIDEBAR_ITEMS: Array<{ id: SettingsSection; label: string; icon: string; danger?: boolean }> = [
  { id: 'timer', label: 'Thời gian', icon: '⏱' },
  { id: 'match', label: 'Ván 3 lượt', icon: '🎯' },
  { id: 'pools', label: 'Pool câu hỏi', icon: '📊' },
  { id: 'sound', label: 'Âm thanh', icon: '🔊' },
  { id: 'gifts', label: 'Quà tặng', icon: '🎁' },
  { id: 'punishments', label: 'Hình phạt', icon: '🔥' },
  { id: 'intro', label: 'Màn Intro', icon: '🎬' },
  { id: 'danger', label: 'Backup / Xóa', icon: '🗑', danger: true },
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

function renderStatBar(appState: AppState): string {
  const categoryCount = appState.categories.length;
  const totalQuestions = appState.categories.reduce(
    (count, category) => count + category.questions.filter(isMcqQuestion).length,
    0,
  );
  const pools = appContext.getQuestionPools();
  const usedCount = Object.values(pools).reduce((sum, ids) => sum + ids.length, 0);

  return `
    <div class="settings-stats flex shrink-0 gap-2.5 max-md:flex-col max-lg:grid max-lg:grid-cols-3 lg:flex lg:flex-row">
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
        <p class="settings-sound-group__title m-0 text-caption font-extrabold uppercase tracking-widest text-amber-200/85">${group.title}</p>
        <div class="sound-events grid gap-3 mt-3 xl:landscape:grid-cols-2">
          ${group.keys.map((eventKey) => renderSoundEventRow(appState, runtime, eventKey)).join('')}
        </div>
      </div>
    `,
  ).join('');
}

function renderTimerPanel(appState: AppState): string {
  const timerSec = appState.settings.timer;
  const { value, unit } = formatTimerDisplay(timerSec);
  const minutesValue = timerMinutesInputValue(timerSec);

  const presets = TIMER_PRESETS.map((preset) => {
    const active = preset.sec === timerSec;
    return `<button
      type="button"
      class="timer-preset-chip ${active ? 'timer-preset-chip--active' : ''}"
      data-action="timer-preset"
      data-timer-sec="${preset.sec}"
    >${preset.label}</button>`;
  }).join('');

  return `
    <div class="settings-panel-card">
      <p class="settings-panel-card__title"><span aria-hidden="true">⏱</span>Thời gian đếm ngược cả bộ thi</p>

      <div class="settings-timer-stepper flex items-center justify-center gap-2.5 mb-2">
        <button
          type="button"
          class="timer-stepper-btn"
          data-action="timer-step-down"
          aria-label="Giảm 1 phút"
          ${timerSec <= DEFAULTS.timerMinSec ? 'disabled' : ''}
        >−</button>
        <div class="timer-input-wrap flex items-center gap-2">
          <input
            id="timer-minutes-input"
            class="timer-minutes-input input"
            type="number"
            inputmode="numeric"
            min="1"
            max="60"
            step="1"
            placeholder="—"
            value="${minutesValue}"
            aria-label="Số phút"
          />
          <span class="timer-input-wrap__unit shrink-0 text-ui font-semibold text-white/70">phút</span>
        </div>
        <button
          type="button"
          class="timer-stepper-btn"
          data-action="timer-step-up"
          aria-label="Tăng 1 phút"
          ${timerSec >= DEFAULTS.timerMaxSec ? 'disabled' : ''}
        >+</button>
      </div>

      <p class="settings-timer-summary m-0 mb-3 text-center" id="timer-summary">
        <span class="settings-timer-value__number text-[clamp(1.1rem,3vw,1.35rem)] font-bold text-white" id="timer-slider-value">${value}</span>
        <span class="settings-timer-value__unit text-ui text-white/45" id="timer-slider-unit">${unit}</span>
      </p>

      <p class="m-0 mb-2 text-center text-caption text-white/45">Nút nhanh</p>
      <div class="timer-preset-grid" role="group" aria-label="Thời gian có sẵn">${presets}</div>
    </div>
  `;
}

function renderMatchNumberField(params: {
  id: string;
  label: string;
  field: string;
  value: number;
  min: number;
  max: number;
  hint?: string;
}): string {
  return `
    <label class="bank-form-label" for="${params.id}">${params.label}</label>
    <input
      id="${params.id}"
      class="input mb-3"
      type="number"
      inputmode="numeric"
      min="${params.min}"
      max="${params.max}"
      step="1"
      data-match-field="${params.field}"
      value="${params.value}"
    />
    ${params.hint ? `<p class="settings-danger-copy m-0 mb-3 -mt-2 text-caption leading-normal text-white/45">${params.hint}</p>` : ''}
  `;
}

function renderMatchPanel(appState: AppState): string {
  const match = appState.settings.match ?? defaultMatchSettings(appState.settings.timer);
  const theoreticalMax = matchTheoreticalMaxScore(match);
  const overCap = theoreticalMax > 400;

  const packageRows = match.round3Packages
    .map((pkg) => {
      const isDefault = pkg.id === match.round3DefaultPackageId;
      const canRemove = match.round3Packages.length > 1;
      return `
        <div class="settings-match-package flex flex-wrap items-end gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3" data-match-package-id="${escapeHtml(pkg.id)}">
          <div class="min-w-0 flex-1 basis-[120px]">
            <label class="bank-form-label" for="match-pkg-points-${escapeHtml(pkg.id)}">Điểm</label>
            <input
              id="match-pkg-points-${escapeHtml(pkg.id)}"
              class="input"
              type="number"
              inputmode="numeric"
              min="1"
              max="100"
              step="1"
              data-match-package-field="points"
              data-package-id="${escapeHtml(pkg.id)}"
              value="${pkg.points}"
            />
          </div>
          <div class="min-w-0 flex-1 basis-[120px]">
            <label class="bank-form-label" for="match-pkg-timer-${escapeHtml(pkg.id)}">Giây</label>
            <input
              id="match-pkg-timer-${escapeHtml(pkg.id)}"
              class="input"
              type="number"
              inputmode="numeric"
              min="${DEFAULTS.timerMinSec}"
              max="${DEFAULTS.timerMaxSec}"
              step="1"
              data-match-package-field="timerSec"
              data-package-id="${escapeHtml(pkg.id)}"
              value="${pkg.timerSec}"
            />
          </div>
          <label class="settings-match-default inline-flex items-center gap-2 pb-2.5 text-caption text-white/70">
            <input
              type="radio"
              name="match-round3-default"
              data-action="match-default-package"
              data-package-id="${escapeHtml(pkg.id)}"
              ${isDefault ? 'checked' : ''}
            />
            Mặc định
          </label>
          <button
            type="button"
            class="btn btn--small btn-ghost shrink-0"
            data-action="match-remove-package"
            data-package-id="${escapeHtml(pkg.id)}"
            ${canRemove ? '' : 'disabled'}
          >Xóa</button>
        </div>
      `;
    })
    .join('');

  return `
    <div class="settings-panel-card grid gap-1">
      <p class="settings-panel-card__title"><span aria-hidden="true">🎯</span>Cấu hình ván 3 lượt</p>
      <p class="settings-danger-copy mb-3.5 text-caption leading-normal text-white/55">
        Số câu / thời gian từng lượt và gói điểm Lượt 3. Cảnh báo trần điểm chỉ mang tính tham khảo — không chặn lưu.
      </p>

      ${
        overCap
          ? `<div class="warning-banner mb-3.5 rounded-[18px] border border-amber-300/30 bg-amber-300/10 px-4 py-3.5 text-amber-200" role="status">
              Điểm tối đa lý thuyết ~${theoreticalMax} &gt; 400. Cân nhắc giảm số câu Lượt 3 hoặc điểm gói cao nhất.
            </div>`
          : `<p class="m-0 mb-3.5 text-caption text-white/45">Điểm tối đa lý thuyết hiện tại: <strong class="text-white/80">${theoreticalMax}</strong> (ngưỡng tham khảo 400).</p>`
      }

      <p class="settings-sound-group__title m-0 mb-2 text-caption font-extrabold uppercase tracking-widest text-amber-200/85">Lượt 1</p>
      ${renderMatchNumberField({
        id: 'match-round1-count',
        label: 'Số câu',
        field: 'round1QuestionCount',
        value: match.round1QuestionCount,
        min: 1,
        max: 50,
      })}
      ${renderMatchNumberField({
        id: 'match-round1-timer',
        label: 'Thời gian mỗi câu (giây)',
        field: 'round1TimerSec',
        value: match.round1TimerSec,
        min: DEFAULTS.timerMinSec,
        max: DEFAULTS.timerMaxSec,
      })}

      <p class="settings-sound-group__title m-0 mb-2 mt-2 text-caption font-extrabold uppercase tracking-widest text-amber-200/85">Lượt 2</p>
      ${renderMatchNumberField({
        id: 'match-round2-per-pack',
        label: 'Số câu mỗi bộ đề',
        field: 'round2QuestionsPerPack',
        value: match.round2QuestionsPerPack,
        min: 1,
        max: 50,
      })}
      ${renderMatchNumberField({
        id: 'match-round2-timer',
        label: 'Thời gian mỗi câu (giây)',
        field: 'round2TimerSec',
        value: match.round2TimerSec,
        min: DEFAULTS.timerMinSec,
        max: DEFAULTS.timerMaxSec,
      })}

      <p class="settings-sound-group__title m-0 mb-2 mt-2 text-caption font-extrabold uppercase tracking-widest text-amber-200/85">Lượt 3</p>
      ${renderMatchNumberField({
        id: 'match-round3-count',
        label: 'Số câu',
        field: 'round3QuestionCount',
        value: match.round3QuestionCount,
        min: 1,
        max: 50,
      })}
      ${renderMatchNumberField({
        id: 'match-round3-pick',
        label: 'Giây chờ chọn gói (tự mặc định)',
        field: 'round3PackagePickSec',
        value: match.round3PackagePickSec,
        min: DEFAULTS.timerMinSec,
        max: DEFAULTS.timerMaxSec,
      })}

      <p class="bank-form-label m-0 mb-2">Gói điểm</p>
      <div class="grid gap-2.5 mb-3">${packageRows}</div>
      <button type="button" class="btn btn-ghost w-full" data-action="match-add-package">+ Thêm gói điểm</button>
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
        Mặc định nằm trong <code class="text-caption text-amber-200/95">public/sounds/</code>.
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

function renderIntroLinkBlock(link: IntroLinkSettings, index: number): string {
  const labelPlaceholder = index === 0 ? DEFAULT_INTRO_LINK_LABEL : `Nút liên kết ${index + 1}`;

  return `
    <div class="intro-link-block" data-intro-link-row>
      <div class="intro-link-block__head">
        <p class="bank-form-label m-0">Liên kết ${index + 1}</p>
        <button
          type="button"
          class="btn btn-ghost btn--compact intro-link-block__remove"
          data-action="remove-intro-link"
          data-intro-link-index="${index}"
        >Xóa</button>
      </div>
      <label class="bank-form-label" for="intro-link-label-input-${index}">Tên nút</label>
      <input
        id="intro-link-label-input-${index}"
        class="input mb-3"
        type="text"
        data-settings-field="intro-link-label"
        placeholder="${labelPlaceholder}"
        value="${escapeHtml(link.label)}"
      />
      <label class="bank-form-label" for="intro-link-url-input-${index}">Đường dẫn (URL)</label>
      <input
        id="intro-link-url-input-${index}"
        class="input"
        type="url"
        inputmode="url"
        data-settings-field="intro-link-url"
        placeholder="https://example.com/kiem-tra"
        value="${escapeHtml(link.url)}"
      />
    </div>
  `;
}

export function renderIntroLinksEditor(links: IntroLinkSettings[]): string {
  const atMax = links.length >= MAX_INTRO_LINKS;
  const list =
    links.length > 0
      ? links.map((link, index) => renderIntroLinkBlock(link, index)).join('')
      : '<p class="intro-links-empty m-0 text-caption leading-normal text-white/45">Chưa có liên kết. Bấm «Thêm liên kết» để tạo nút trên màn Intro.</p>';

  return `
    <div id="intro-links-list" class="intro-links-list grid gap-4">${list}</div>
    <button
      type="button"
      class="btn btn-ghost btn--compact intro-links-add mt-4 w-full"
      data-action="add-intro-link"
      ${atMax ? 'disabled' : ''}
    >+ Thêm liên kết${atMax ? ` (tối đa ${MAX_INTRO_LINKS})` : ''}</button>
  `;
}

function resolveIntroLinksForEditor(appState: AppState, runtime: RuntimeState): IntroLinkSettings[] {
  return runtime.settingsDraft?.introLinks ?? appState.settings.introLinks;
}

function renderIntroPanel(appState: AppState, runtime: RuntimeState): string {
  const links = resolveIntroLinksForEditor(appState, runtime);

  return `
    <div class="settings-panel-card">
      <p class="settings-panel-card__title"><span aria-hidden="true">🎬</span>Nút liên kết màn Intro</p>
      <p class="settings-danger-copy mb-3.5 text-caption leading-normal text-white/55">
        Thêm nút bên cạnh «Vòng xoay kiến thức». Chỉ hiện trên Intro khi đã nhập URL (<code class="text-caption text-amber-200/95">https://...</code>). Tối đa ${MAX_INTRO_LINKS} nút.
      </p>
      <div class="intro-links-editor" id="intro-links-editor">
        ${renderIntroLinksEditor(links)}
      </div>
    </div>
  `;
}

function renderPoolsPanel(appState: AppState): string {
  const pools = appContext.getQuestionPools();

  const rows = appState.categories
    .map((category) => {
      const total = category.questions.filter(isMcqQuestion).length;
      const used = countUsedInCategory(pools, category.id);
      const remaining = Math.max(0, total - used);
      return `
        <div class="settings-pool-row flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3">
          <div class="min-w-0">
            <strong class="text-subtitle" style="color:${category.color}">${escapeHtml(category.name)}</strong>
            <p class="m-0 mt-1 text-caption text-white/50">${used} đã dùng · ${remaining} còn lại · ${total} tổng</p>
          </div>
          <button
            type="button"
            class="btn btn--small btn-ghost shrink-0"
            data-action="reset-category-pool"
            data-category-id="${category.id}"
          >Reset</button>
        </div>
      `;
    })
    .join('');

  return `
    <div class="settings-panel-card">
      <p class="settings-panel-card__title"><span aria-hidden="true">📊</span>Pool câu hỏi theo lĩnh vực</p>
      <p class="settings-danger-copy mb-3.5 text-caption leading-normal text-white/55">
        Theo dõi câu đã dùng cho các luồng cũ (không áp dụng cho Ván 3 lượt — ván tự theo dõi câu đã dùng riêng trong phiên chơi).
      </p>
      <div class="grid gap-2.5">${rows || '<p class="text-caption text-white/45">Chưa có lĩnh vực.</p>'}</div>
      <button type="button" class="btn btn-ghost mt-4 w-full" data-action="reset-all-pools">Reset toàn bộ pool</button>
    </div>
  `;
}

function renderDangerPanel(): string {
  return `
    <div class="settings-panel-card settings-panel-card--danger grid gap-4">
      <div>
        <p class="settings-panel-card__title"><span aria-hidden="true">💾</span>Backup dữ liệu</p>
        <p class="settings-danger-copy mb-3.5 text-caption leading-normal text-white/55">
          Xuất / nhập toàn bộ lĩnh vực, câu hỏi, quà, phạt và cài đặt (không gồm file âm thanh).
          Trên Android: <strong>Xuất</strong> lưu file <code class="text-caption">.json</code> thẳng vào
          <strong>Downloads</strong>; <strong>Nhập</strong> chọn file đó để khôi phục.
        </p>
        <div class="flex flex-wrap gap-2.5">
          <button type="button" class="btn btn-primary" data-action="export-backup">Xuất backup</button>
          <label class="btn btn-ghost relative m-0 cursor-pointer">
            Nhập backup
            <input
              id="backup-import-input"
              class="bank-import-btn__input"
              type="file"
              accept=".json,text/plain,application/json,application/octet-stream,*/*"
              aria-label="Nhập file backup"
            />
          </label>
        </div>
      </div>
      <div>
        <p class="settings-panel-card__title"><span aria-hidden="true">🗑</span>Xóa toàn bộ dữ liệu</p>
        <p class="settings-danger-copy mb-3.5 text-caption leading-normal text-white/55">
          Xóa sạch toàn bộ lĩnh vực, câu hỏi, pool câu đã dùng và đưa app về dữ liệu mẫu. Hành động này không thể hoàn tác.
        </p>
        <button type="button" class="btn btn-danger" data-action="clear-all">Xóa sạch toàn bộ kho câu hỏi</button>
      </div>
    </div>
  `;
}

function renderContentPanel(appState: AppState, runtime: RuntimeState, section: SettingsSection): string {
  if (section === 'timer') {
    return renderTimerPanel(appState);
  }
  if (section === 'match') {
    return renderMatchPanel(appState);
  }
  if (section === 'pools') {
    return renderPoolsPanel(appState);
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
    <section class="panel panel--settings flex h-full min-h-0 flex-col overflow-hidden p-[18px]">
      <div class="settings-layout flex min-h-0 flex-1 items-stretch gap-3.5 max-lg:flex-col lg:flex-row">
        ${renderSidebar(section)}
        <div class="settings-main flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          ${renderStatBar(appState)}
          <div class="settings-content min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">${renderContentPanel(appState, runtime, section)}</div>
        </div>
      </div>
    </section>
  `;
}
