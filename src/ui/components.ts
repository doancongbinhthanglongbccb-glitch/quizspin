import { appContext } from '../core/state';
import { buildWheelModel } from '../core/wheel';
import { renderModal } from './components/modal';
import { renderConfirmDialog } from './components/confirm-dialog';
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
import { hasPendingLogoFlight, runLogoFlightToHeader } from './intro-logo-transition';

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
        <span class="nav-tab__icon leading-none max-md:text-[1.2rem] md:max-lg:text-[1.65rem] lg:text-[1.75rem]" aria-hidden="true">${meta.icon}</span>
        <span class="nav-tab__label font-bold leading-tight max-md:hidden">${meta.label}</span>
        <span class="nav-tab__short text-[0.7rem] font-bold leading-tight md:hidden">${meta.short}</span>
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
      <span class="text-[1.1rem] leading-none" aria-hidden="true">↻</span>
      <span class="intro-replay-fab__label intro-replay-fab__label--short">INTRO</span>
      <span class="intro-replay-fab__label intro-replay-fab__label--long hidden tablet:inline">${INTRO_COPY.replayLabel}</span>
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

  const enteringFromIntro = consumeAppEntryAnimation();
  const logoHandoff = hasPendingLogoFlight();
  const appShellClass = enteringFromIntro
    ? `app-shell app-shell--entering${logoHandoff ? ' app-shell--entering-logo' : ''} flex min-h-dvh w-full min-w-0 flex-col overflow-x-clip lg:landscape:flex-row`
    : 'app-shell flex min-h-dvh w-full min-w-0 flex-col overflow-x-clip lg:landscape:flex-row';

  appRoot.innerHTML = `
    <div class="${appShellClass}">
      ${renderTabs()}

      <div class="app-body flex-1 w-full min-w-0 max-w-full overflow-x-clip p-4 pb-nav [-webkit-overflow-scrolling:touch] lg:landscape:pb-4">
        <header class="app-header mb-[18px] min-w-0 max-w-full rounded-[18px] border border-accent-yellow/20 px-4 py-3.5 pb-4">
          <div class="flex min-w-0 items-center gap-3.5">
            <img
              class="app-header__logo h-12 w-auto shrink-0 rounded-full border-2 border-accent-yellow/45 bg-[#0f2410] object-cover shadow-lg max-lg:h-12 lg:landscape:h-11 xl:landscape:h-14"
              src="${INTRO_ASSETS.headerLogo}"
              alt="${INTRO_COPY.logoAlt}"
              width="56"
              height="56"
              decoding="async"
            />
            <h1 class="app-header__title m-0 min-w-0 flex-1 truncate">VÒNG QUAY KIẾN THỨC</h1>
          </div>
        </header>

        <main class="content-area grid w-full min-w-0 max-w-full gap-[18px]" data-swipe-zone="content">
          ${content}
        </main>
      </div>

      ${runtime.toast ? `<div class="toast fixed left-1/2 z-30 -translate-x-1/2 rounded-full border border-white/10 bg-gray-900/95 px-5 py-3 text-ui font-semibold shadow-xl bottom-[calc(96px+env(safe-area-inset-bottom,0px))] lg:landscape:bottom-6">${runtime.toast}</div>` : ''}
      ${renderModal(appState, runtime)}
      ${renderConfirmDialog(runtime.confirmDialog)}
      ${renderIntroReplayFab()}
    </div>
  `;

  eventCleanups = bindEvents();
  mountWheelCanvas();
  restoreFocus(focusSnapshot);
  restoreScroll(appRoot, scrollSnapshot);

  if (hasPendingLogoFlight()) {
    const headerLogo = appRoot.querySelector<HTMLImageElement>('.app-header__logo');
    if (headerLogo) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => runLogoFlightToHeader(headerLogo));
      });
    }
  }
}

function renderIntro(): void {
  cleanupRenderLifecycle();
  cleanupWheel();
  appRoot.innerHTML = renderIntroScreen(appContext.getAppState());
  eventCleanups = [bindIntroHandlers(appRoot)];
}

function bindConfirmHandlers(): () => void {
  const onClick = (event: Event): void => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-action]') : null;
    if (!target || !appRoot.contains(target)) {
      return;
    }

    if (target.dataset.action === 'cancel-confirm') {
      Actions.cancelConfirmDialog();
      return;
    }

    if (target.dataset.action === 'accept-confirm') {
      void Actions.confirmDialogAction();
    }
  };

  appRoot.addEventListener('click', onClick);
  return () => appRoot.removeEventListener('click', onClick);
}

function bindEvents(): Array<() => void> {
  const swipeRoot = appRoot.querySelector<HTMLElement>('[data-swipe-zone="content"]') ?? appRoot;

  return [
    bindNavigationEvents(),
    bindConfirmHandlers(),
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
