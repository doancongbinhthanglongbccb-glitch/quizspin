import { DEFAULTS } from '../../config';
import { defaultMatchSettings, matchTheoreticalMaxScore, MATCH_ROUND_NAMES, MATCH_SCORE_CAP, buildRound3PackageQuotas } from '../../config/match';
import { appContext, type RuntimeState } from '../../core/state';
import type { AppState, IntroLinkSettings, SettingsSection, SoundEventKey } from '../../types';
import { DEFAULT_SOUND_FILE_NAMES, SOUND_EVENT_GROUPS } from '../../config/sounds';
import { DEFAULT_INTRO_LINK_LABEL, isMcqQuestion, SOUND_EVENT_LABELS } from '../../data';
import { MAX_INTRO_LINKS } from '../../types';
import { countUsedQuestionsInBank } from '../../core/pool-manager';
import { escapeHtml } from '../../utils/html';

const SIDEBAR_ITEMS: Array<{ id: SettingsSection; label: string; danger?: boolean }> = [
  { id: 'match', label: 'Ván 3 màn' },
  { id: 'sound', label: 'Âm thanh' },
  { id: 'intro', label: 'Màn Intro' },
  { id: 'pool', label: 'Đã dùng' },
  { id: 'danger', label: 'Backup / Xóa', danger: true },
];

const SECTION_TITLES: Record<SettingsSection, string> = {
  match: 'Ván 3 màn',
  sound: 'Âm thanh',
  intro: 'Màn Intro',
  pool: 'Đã dùng',
  danger: 'Backup / Xóa',
};

function renderSidebar(active: SettingsSection): string {
  const mainItems = SIDEBAR_ITEMS.filter((item) => !item.danger);
  const dangerItem = SIDEBAR_ITEMS.find((item) => item.danger);

  const item = (entry: (typeof SIDEBAR_ITEMS)[number]) => {
    const isActive = entry.id === active;
    const classes = [
      'settings-rail__item',
      isActive ? 'settings-rail__item--active' : '',
      entry.danger ? 'settings-rail__item--danger' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return `
      <button
        type="button"
        class="${classes}"
        data-action="settings-section"
        data-section="${entry.id}"
        aria-current="${isActive ? 'page' : 'false'}"
      >${entry.label}</button>
    `;
  };

  return `
    <nav class="settings-rail" aria-label="Mục cài đặt">
      <p class="settings-rail__label">Mục</p>
      <div class="settings-rail__list">
        ${mainItems.map(item).join('')}
      </div>
      ${
        dangerItem
          ? `<div class="settings-rail__foot">${item(dangerItem)}</div>`
          : ''
      }
    </nav>
  `;
}

function renderMasthead(appState: AppState, section: SettingsSection): string {
  const categoryCount = appState.categories.length;
  const totalQuestions = appState.categories.reduce(
    (count, category) => count + category.questions.filter(isMcqQuestion).length,
    0,
  );
  const usedCount = countUsedQuestionsInBank(appContext.getQuestionPools(), appState.categories);
  const bankTotal = appState.categories.reduce((count, category) => count + category.questions.length, 0);

  return `
    <header class="settings-masthead">
      <div class="settings-masthead__copy">
        <p class="settings-masthead__eyebrow">Cài đặt</p>
        <h2 class="settings-masthead__title">${SECTION_TITLES[section]}</h2>
      </div>
      <p class="settings-masthead__stats" aria-label="Thống kê ngân hàng">
        ${categoryCount} lĩnh vực · ${totalQuestions} câu · Đã dùng ${usedCount}/${bankTotal}
      </p>
    </header>
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
    <div class="sound-event-row${isPending ? ' sound-event-row--pending' : ''}">
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

function renderMatchNumberField(params: {
  id: string;
  label: string;
  field: string;
  value: number;
  min: number;
  max: number;
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
  `;
}

function renderMatchPanel(appState: AppState): string {
  const match = appState.settings.match ?? defaultMatchSettings(appState.settings.timer);
  const theoreticalMax = matchTheoreticalMaxScore(match);
  const overCap = theoreticalMax > MATCH_SCORE_CAP;
  const quotas = buildRound3PackageQuotas(match);

  const packageRows = match.round3Packages
    .map((pkg) => {
      const isDefault = pkg.id === match.round3DefaultPackageId;
      const canRemove = match.round3Packages.length > 1;
      const quota = quotas[pkg.id];
      const quotaHint = isDefault ? 'Không giới hạn' : `${quota ?? 0} lần/ván`;
      return `
        <div class="settings-match-package" data-match-package-id="${escapeHtml(pkg.id)}">
          <div class="settings-match-package__field">
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
          <div class="settings-match-package__field">
            <label class="bank-form-label" for="match-pkg-timer-${escapeHtml(pkg.id)}">Cửa sổ (giây)</label>
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
          <label class="settings-match-default">
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
            class="btn btn--small btn-ghost"
            data-action="match-remove-package"
            data-package-id="${escapeHtml(pkg.id)}"
            ${canRemove ? '' : 'disabled'}
          >Xóa</button>
          <p class="settings-match-package__meta">${quotaHint}</p>
        </div>
      `;
    })
    .join('');

  return `
    <div class="settings-panel-card grid gap-1">
      ${
        overCap
          ? `<div class="warning-banner mb-3.5" role="status">
              Điểm tối đa ~${theoreticalMax} &gt; ${MATCH_SCORE_CAP}. Giảm số câu ${MATCH_ROUND_NAMES[3]} hoặc điểm gói.
            </div>`
          : ''
      }

      <p class="settings-sound-group__title">${MATCH_ROUND_NAMES[1]}</p>
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

      <p class="settings-sound-group__title mt-2">${MATCH_ROUND_NAMES[2]}</p>
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

      <p class="settings-sound-group__title mt-2">${MATCH_ROUND_NAMES[3]}</p>
      ${renderMatchNumberField({
        id: 'match-round3-count',
        label: 'Số câu',
        field: 'round3QuestionCount',
        value: match.round3QuestionCount,
        min: 1,
        max: 50,
      })}
      ${renderMatchNumberField({
        id: 'match-round3-timer',
        label: 'Thời gian mỗi câu (giây)',
        field: 'round3TimerSec',
        value: match.round3TimerSec,
        min: DEFAULTS.timerMinSec,
        max: DEFAULTS.timerMaxSec,
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
      <div class="settings-match-packages">${packageRows}</div>
      <button type="button" class="btn btn-ghost w-full mt-3" data-action="match-add-package">+ Thêm gói điểm</button>
    </div>
  `;
}

function renderSoundPanel(appState: AppState, runtime: RuntimeState): string {
  return `
    <div class="settings-panel-card">
      <div class="settings-panel-card__head">
        <p class="settings-panel-card__title settings-panel-card__title--inline">Bật âm thanh</p>
        <label class="settings-toggle">
          <input id="sound-toggle" type="checkbox" class="absolute h-0 w-0 opacity-0" ${appState.settings.sound ? 'checked' : ''} />
          <span class="settings-toggle__track" aria-hidden="true"></span>
        </label>
      </div>
      ${renderSoundEvents(appState, runtime)}
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
      : '<p class="intro-links-empty">Chưa có liên kết.</p>';

  return `
    <div id="intro-links-list" class="intro-links-list">${list}</div>
    <button
      type="button"
      class="btn btn-ghost btn--compact intro-links-add"
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
      <div class="intro-links-editor" id="intro-links-editor">
        ${renderIntroLinksEditor(links)}
      </div>
    </div>
  `;
}

function renderPoolPanel(appState: AppState): string {
  const pools = appContext.getQuestionPools();
  const usedCount = countUsedQuestionsInBank(pools, appState.categories);
  const bankTotal = appState.categories.reduce((count, category) => count + category.questions.length, 0);
  const remaining = Math.max(0, bankTotal - usedCount);

  const byCategory = appState.categories
    .map((category) => {
      const usedInCategory = (pools[category.id] ?? []).filter((id) =>
        category.questions.some((question) => question.id === id),
      ).length;
      const totalInCategory = category.questions.length;
      return `
        <li class="settings-pool-row">
          <span class="settings-pool-row__name">${escapeHtml(category.name)}</span>
          <span class="settings-pool-row__count">${usedInCategory}/${totalInCategory}</span>
        </li>`;
    })
    .join('');

  return `
    <div class="settings-panel-card settings-panel-card--pool">
      <div class="settings-stats settings-stats--inline">
        <div class="settings-stat-box settings-stat-box--accent">
          <p class="settings-stat-box__label">Đã dùng</p>
          <p class="settings-stat-box__value">${usedCount}</p>
        </div>
        <div class="settings-stat-box">
          <p class="settings-stat-box__label">Còn lại</p>
          <p class="settings-stat-box__value">${remaining}</p>
        </div>
        <div class="settings-stat-box">
          <p class="settings-stat-box__label">Tổng</p>
          <p class="settings-stat-box__value">${bankTotal}</p>
        </div>
      </div>
      <ul class="settings-pool-list" aria-label="Đã dùng theo lĩnh vực">
        ${byCategory || '<li class="settings-pool-row settings-pool-row--empty">Chưa có lĩnh vực.</li>'}
      </ul>
      <button type="button" class="btn btn-ghost" data-action="clear-used-questions" ${usedCount ? '' : 'disabled'}>
        Xóa lịch sử đã dùng
      </button>
    </div>
  `;
}

function renderDangerPanel(): string {
  return `
    <div class="settings-panel-card settings-panel-card--danger grid gap-5">
      <div>
        <p class="settings-panel-card__title">Backup dữ liệu</p>
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
        <p class="settings-panel-card__title">Xóa toàn bộ dữ liệu</p>
        <button type="button" class="btn btn-danger" data-action="clear-all">Xóa sạch toàn bộ kho câu hỏi</button>
      </div>
    </div>
  `;
}

function renderContentPanel(appState: AppState, runtime: RuntimeState, section: SettingsSection): string {
  if (section === 'match') {
    return renderMatchPanel(appState);
  }
  if (section === 'sound') {
    return renderSoundPanel(appState, runtime);
  }
  if (section === 'intro') {
    return renderIntroPanel(appState, runtime);
  }
  if (section === 'pool') {
    return renderPoolPanel(appState);
  }
  return renderDangerPanel();
}

export function renderSettingsTab(appState: AppState, runtime: RuntimeState): string {
  const section = SIDEBAR_ITEMS.some((item) => item.id === runtime.settingsSection)
    ? runtime.settingsSection
    : 'match';

  return `
    <section class="panel panel--settings">
      ${renderMasthead(appState, section)}
      <div class="settings-layout">
        ${renderSidebar(section)}
        <div class="settings-stage">
          <div class="settings-content">${renderContentPanel(appState, runtime, section)}</div>
        </div>
      </div>
    </section>
  `;
}
