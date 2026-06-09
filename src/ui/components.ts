import { appContext, type RuntimeState } from '../core/state';
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
import { isIntroExitInProgress } from './handlers/intro-handlers';
import { initModalDom } from './handlers/modal-handlers';
import { syncToastDom } from '../utils/sync-toast-dom';
import { captureScroll, restoreScroll } from '../utils/scroll-restore';
import { consumeAppEntryAnimation } from './intro-transition';
import { clearLogoFlight, hasPendingLogoFlight, runLogoFlightToHeader } from './intro-logo-transition';
import { getModalRenderKey } from '../utils/modal-render-key';
import { getShellRenderKey } from '../utils/shell-render-key';
import { syncSpinUi } from '../utils/sync-spin-ui';
import { canReplayIntro, canSwitchTab, getNavigationBlockReason } from '../utils/navigation-guard';
import { showToast } from '../core/toast';

const TAB_META: Record<'spin' | 'bank' | 'settings', { label: string; short: string; icon: string }> = {
  spin: { label: 'Vòng Quay', short: 'Quay', icon: '🎖️' },
  bank: { label: 'Ngân Hàng Câu Hỏi', short: 'Ngân Hàng', icon: '📋' },
  settings: { label: 'Cài Đặt', short: 'Cài đặt', icon: '⚙️' },
};

const appRoot = document.querySelector<HTMLDivElement>('#app')!;
let wheelCleanup: (() => void) | null = null;
let eventCleanups: Array<() => void> = [];
let lastModalRenderKey = '';
let lastShellRenderKey = '';
let lastConfirmKey = '';
let lastToastMessage = '';
let isRendering = false;
let pendingRender = false;

type OverlayHosts = {
  shell: HTMLElement;
  toast: HTMLElement;
  modal: HTMLElement;
  confirm: HTMLElement;
  fab: HTMLElement;
};

let overlayHosts: OverlayHosts | null = null;

function ensureOverlayHosts(): OverlayHosts {
  if (overlayHosts?.shell.isConnected) {
    return overlayHosts;
  }

  appRoot.replaceChildren();

  const shell = document.createElement('div');
  const toast = document.createElement('div');
  const modal = document.createElement('div');
  const confirm = document.createElement('div');
  const fab = document.createElement('div');

  shell.id = 'app-shell-root';
  toast.id = 'toast-host';
  modal.id = 'modal-host';
  confirm.id = 'confirm-host';
  fab.id = 'intro-fab-host';

  appRoot.append(shell, toast, modal, confirm, fab);
  overlayHosts = { shell, toast, modal, confirm, fab };
  lastModalRenderKey = '';
  lastShellRenderKey = '';
  lastConfirmKey = '';
  lastToastMessage = '';
  return overlayHosts;
}

type FocusSnapshot = {
  id: string;
  selectionStart: number;
  selectionEnd: number;
} | null;

const SETTINGS_FIELD_IDS = new Set([
  'gifts-input',
  'punishments-input',
  'intro-link-label-input',
  'intro-link-url-input',
]);

let lastRenderedSettingsSection: RuntimeState['settingsSection'] | null = null;

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

function restoreFocus(snapshot: FocusSnapshot, skipSettingsFields = false): void {
  if (!snapshot) {
    return;
  }

  if (skipSettingsFields && SETTINGS_FIELD_IDS.has(snapshot.id)) {
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
      <span class="intro-replay-fab__icon" aria-hidden="true">↻</span>
      <span class="intro-replay-fab__label intro-replay-fab__label--short">INTRO</span>
      <span class="intro-replay-fab__label intro-replay-fab__label--long">${INTRO_COPY.replayLabel}</span>
    </button>
  `;
}

export function render(): void {
  if (isRendering) {
    pendingRender = true;
    return;
  }

  isRendering = true;

  try {
    renderOnce();
  } finally {
    isRendering = false;
    if (pendingRender) {
      pendingRender = false;
      queueMicrotask(() => render());
    }
  }
}

function renderOnce(): void {
  Actions.closeModalIfQuestionMissing();

  const runtime = appContext.getRuntimeState();
  const settingsSectionChanged =
    runtime.tab === 'settings' &&
    lastRenderedSettingsSection !== null &&
    lastRenderedSettingsSection !== runtime.settingsSection;

  if (runtime.showIntro) {
    renderIntro();
    return;
  }

  const appState = appContext.getAppState();
  const nextRuntime = appContext.getRuntimeState();
  const hosts = ensureOverlayHosts();
  const shellKey = getShellRenderKey(appState, nextRuntime);
  const modalKey = getModalRenderKey(appState, nextRuntime);
  const confirmKey = JSON.stringify(nextRuntime.confirmDialog);
  const shouldRebuildShell = shellKey !== lastShellRenderKey;

  if (
    !shouldRebuildShell &&
    modalKey === lastModalRenderKey &&
    confirmKey === lastConfirmKey &&
    nextRuntime.toast === lastToastMessage
  ) {
    return;
  }

  const focusSnapshot = shouldRebuildShell ? captureFocus() : null;
  const scrollSnapshot = shouldRebuildShell ? captureScroll(appRoot) : null;

  if (shouldRebuildShell) {
    cleanupRenderLifecycle();

    const content =
      nextRuntime.tab === 'spin'
        ? renderSpinTab(appState, nextRuntime)
        : nextRuntime.tab === 'bank'
          ? renderBankTab(appState, nextRuntime)
          : renderSettingsTab(appState, nextRuntime);

    const enteringFromIntro = consumeAppEntryAnimation();
    const logoHandoff = hasPendingLogoFlight();
    const appShellClass = enteringFromIntro
      ? `app-shell app-shell--entering${logoHandoff ? ' app-shell--entering-logo' : ''} flex min-h-dvh w-full min-w-0 flex-col overflow-x-clip lg:landscape:flex-row`
      : 'app-shell flex min-h-dvh w-full min-w-0 flex-col overflow-x-clip lg:landscape:flex-row';

    hosts.shell.innerHTML = `
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
      </div>
    `;

    lastShellRenderKey = shellKey;
    hosts.fab.innerHTML = renderIntroReplayFab();
    eventCleanups = bindEvents();
    mountWheelCanvas();
    if (nextRuntime.tab === 'spin') {
      syncSpinUi();
    }

    if (focusSnapshot) {
      restoreFocus(focusSnapshot, settingsSectionChanged);
    }
    if (scrollSnapshot) {
      restoreScroll(appRoot, scrollSnapshot);
    }
  }

  if (nextRuntime.toast !== lastToastMessage) {
    lastToastMessage = nextRuntime.toast;
    syncToastDom(nextRuntime.toast, hosts.toast);
  }

  if (modalKey !== lastModalRenderKey) {
    lastModalRenderKey = modalKey;
    hosts.modal.innerHTML = renderModal(appState, nextRuntime);
    initModalDom(appRoot);
    syncSpinUi();
  }

  if (confirmKey !== lastConfirmKey) {
    lastConfirmKey = confirmKey;
    hosts.confirm.innerHTML = renderConfirmDialog(nextRuntime.confirmDialog);
  }

  if (nextRuntime.tab === 'settings') {
    lastRenderedSettingsSection = nextRuntime.settingsSection;
  } else {
    lastRenderedSettingsSection = null;
  }

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
  if (isIntroExitInProgress()) {
    return;
  }

  if (appRoot.querySelector('.intro-screen')) {
    return;
  }

  clearLogoFlight();
  cleanupRenderLifecycle();
  cleanupWheel();
  overlayHosts = null;
  lastModalRenderKey = '';
  lastShellRenderKey = '';
  lastConfirmKey = '';
  lastToastMessage = '';
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

    if (target.dataset.action === 'confirm-rename-category') {
      Actions.confirmRenameCategoryFromMenu();
      return;
    }

    if (target.dataset.action === 'confirm-delete-category') {
      Actions.confirmDeleteCategoryFromMenu();
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
      if (!canReplayIntro()) {
        showToast('Đang quay, vui lòng chờ');
        return;
      }
      cleanupWheel();
      Actions.showIntro();
      return;
    }

    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-action="switch-tab"]') : null;
    if (!target || !appRoot.contains(target)) {
      return;
    }

    if (!canSwitchTab()) {
      const reason = getNavigationBlockReason();
      if (reason) {
        showToast(reason);
      }
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
