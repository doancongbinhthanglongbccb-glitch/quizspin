import { appContext } from '../core/state';
import { buildWheelModel } from '../core/wheel';
import { renderModal } from './components/modal';
import { renderSpinTab } from './components/spin-tab';
import { renderBankTab } from './components/bank-tab';
import { renderSettingsTab } from './components/settings-tab';
import { renderIntroScreen } from './components/intro-screen';
import { INTRO_ASSETS, INTRO_COPY } from '../config/intro';
import { WheelRenderer } from './components/wheel';
import * as Actions from '../core/actions';
import { bindSpinHandlers, bindBankHandlers, bindModalHandlers, bindSettingsHandlers, bindSwipeHandlers, bindIntroHandlers } from './handlers';
import { captureScroll, restoreScroll } from '../utils/scroll-restore';
import { consumeAppEntryAnimation } from './intro-transition';

const TAB_META: Record<'spin' | 'bank' | 'settings', { label: string; short: string; icon: string }> = {
  spin: { label: 'Vòng Quay', short: 'Quay', icon: '🎖️' },
  bank: { label: 'Ngân Hàng Câu Hỏi', short: 'Ngân Hàng', icon: '📋' },
  settings: { label: 'Cài Đặt', short: 'Cài đặt', icon: '⚙️' },
};

const appRoot = document.querySelector<HTMLDivElement>('#app')!;
let wheelCleanup: (() => void) | null = null;
let eventCleanups: Array<() => void> = [];

type FocusSnapshot = {
  id: string;
  selectionStart: number;
  selectionEnd: number;
} | null;

function captureFocus(): FocusSnapshot {
  const active = document.activeElement;
  if (!(active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)) {
    return null;
  }

  if (!active.id || !appRoot.contains(active)) {
    return null;
  }

  return {
    id: active.id,
    selectionStart: active.selectionStart ?? active.value.length,
    selectionEnd: active.selectionEnd ?? active.value.length,
  };
}

function restoreFocus(snapshot: FocusSnapshot): void {
  if (!snapshot) {
    return;
  }

  const element = document.getElementById(snapshot.id);
  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
    return;
  }

  element.focus();
  try {
    element.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
  } catch {
    // Một số input type không hỗ trợ selection range.
  }
}

if (!appRoot) {
  throw new Error('Missing app root');
}

function renderTabs(): string {
  const runtime = appContext.getRuntimeState();
  const button = (key: 'spin' | 'bank' | 'settings') => {
    const meta = TAB_META[key];
    const active = runtime.tab === key ? ' nav-tab--active' : '';
    return `
      <button
        class="nav-tab${active}"
        data-action="switch-tab"
        data-tab="${key}"
        aria-label="${meta.label}"
        aria-current="${runtime.tab === key ? 'page' : 'false'}"
      >
        <span class="nav-tab__icon" aria-hidden="true">${meta.icon}</span>
        <span class="nav-tab__label">${meta.label}</span>
        <span class="nav-tab__short">${meta.short}</span>
      </button>
    `;
  };

  return `
    <nav class="nav-shell" aria-label="Điều hướng chính">
      ${button('spin')}
      ${button('bank')}
      ${button('settings')}
    </nav>
  `;
}

function renderIntroReplayFab(): string {
  return `
    <button
      type="button"
      class="intro-replay-fab"
      data-action="show-intro"
      aria-label="${INTRO_COPY.replayLabel}"
      title="${INTRO_COPY.replayLabel}"
    >
      <span class="intro-replay-fab__icon" aria-hidden="true">↻</span>
      <span class="intro-replay-fab__label intro-replay-fab__label--short">INTRO</span>
      <span class="intro-replay-fab__label intro-replay-fab__label--long">${INTRO_COPY.replayLabel}</span>
    </button>
  `;
}

export function render(): void {
  const runtime = appContext.getRuntimeState();

  if (runtime.showIntro) {
    renderIntro();
    return;
  }

  const focusSnapshot = captureFocus();
  const scrollSnapshot = captureScroll(appRoot);
  const appState = appContext.getAppState();
  const content =
    runtime.tab === 'spin'
      ? renderSpinTab(appState, runtime)
      : runtime.tab === 'bank'
        ? renderBankTab(appState, runtime)
        : renderSettingsTab(appState, runtime);

  cleanupRenderLifecycle();

  const appShellClass = consumeAppEntryAnimation() ? 'app-shell app-shell--entering' : 'app-shell';

  appRoot.innerHTML = `
    <div class="${appShellClass}">
      ${renderTabs()}

      <div class="app-body">
        <header class="app-header">
          <div class="app-header__inner">
            <img
              class="app-header__logo"
              src="${INTRO_ASSETS.headerLogo}"
              alt="${INTRO_COPY.logoAlt}"
              width="56"
              height="56"
              decoding="async"
            />
            <h1 class="app-header__title">VÒNG QUAY KIẾN THỨC</h1>
          </div>
        </header>

        <main class="content-area" data-swipe-zone="content">
          ${content}
        </main>
      </div>

      ${runtime.toast ? `<div class="toast">${runtime.toast}</div>` : ''}
      ${renderModal(appState, runtime)}
      ${renderIntroReplayFab()}
    </div>
  `;

  eventCleanups = bindEvents();
  mountWheelCanvas();
  restoreFocus(focusSnapshot);
  restoreScroll(appRoot, scrollSnapshot);
}

function renderIntro(): void {
  cleanupRenderLifecycle();
  cleanupWheel();
  appRoot.innerHTML = renderIntroScreen();
  eventCleanups = [bindIntroHandlers(appRoot)];
}

function bindEvents(): Array<() => void> {
  const swipeRoot = appRoot.querySelector<HTMLElement>('[data-swipe-zone="content"]') ?? appRoot;

  return [
    bindNavigationEvents(),
    bindSwipeHandlers(swipeRoot, cleanupWheel),
    bindSpinHandlers(appRoot),
    bindBankHandlers(appRoot),
    bindSettingsHandlers(appRoot),
    bindModalHandlers(appRoot),
  ];
}

function bindNavigationEvents(): () => void {
  const onClick = (event: Event): void => {
    const introTarget =
      event.target instanceof Element ? event.target.closest<HTMLElement>('[data-action="show-intro"]') : null;
    if (introTarget && appRoot.contains(introTarget)) {
      cleanupWheel();
      Actions.showIntro();
      return;
    }

    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-action="switch-tab"]') : null;
    if (!target || !appRoot.contains(target)) {
      return;
    }

    cleanupWheel();
    appContext.setRuntimeState({ tab: target.dataset.tab as 'spin' | 'bank' | 'settings' });
  };

  appRoot.addEventListener('click', onClick);
  return () => {
    appRoot.removeEventListener('click', onClick);
  };
}

function cleanupWheel(): void {
  WheelRenderer.destroy();
  wheelCleanup = null;
}

function cleanupRenderLifecycle(): void {
  eventCleanups.forEach((cleanup) => cleanup());
  eventCleanups = [];
}

function mountWheelCanvas(): void {
  const runtime = appContext.getRuntimeState();
  if (runtime.tab !== 'spin') {
    WheelRenderer.destroy();
    wheelCleanup = null;
    return;
  }

  const appState = appContext.getAppState();
  const model = buildWheelModel(appState);
  wheelCleanup = WheelRenderer.ensure('[data-wheel-host]', model, runtime.rotation);
}
