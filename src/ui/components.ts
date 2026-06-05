import { appContext } from '../core/state';
import { buildWheelModel } from '../core/wheel';
import { renderModal } from './components/modal';
import { renderSpinTab } from './components/spin-tab';
import { renderBankTab } from './components/bank-tab';
import { renderSettingsTab } from './components/settings-tab';
import { WheelRenderer } from './components/wheel';
import { bindSpinHandlers, bindBankHandlers, bindModalHandlers, bindSettingsHandlers, bindSwipeHandlers } from './handlers';

const TAB_META: Record<'spin' | 'bank' | 'settings', { label: string; short: string; icon: string }> = {
  spin: { label: 'Vòng quay', short: 'Quay', icon: '🎯' },
  bank: { label: 'Ngân hàng', short: 'Kho', icon: '📚' },
  settings: { label: 'Cài đặt', short: 'Cài đặt', icon: '⚙️' },
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

export function render(): void {
  const focusSnapshot = captureFocus();
  const appState = appContext.getAppState();
  const runtime = appContext.getRuntimeState();
  const content =
    runtime.tab === 'spin'
      ? renderSpinTab(appState, runtime)
      : runtime.tab === 'bank'
        ? renderBankTab(appState, runtime)
        : renderSettingsTab(appState, runtime);

  cleanupRenderLifecycle();

  appRoot.innerHTML = `
    <div class="app-shell">
      ${renderTabs()}

      <div class="app-body">
        <header class="app-header">
          <div>
            <div class="eyebrow">QuizSpin</div>
            <h1>Vòng quay kiến thức offline</h1>
          </div>
          <div class="header-pills">
            <span class="mini-pill">${appState.categories.length} lĩnh vực</span>
            <span class="mini-pill">${appState.categories.reduce((count, category) => count + category.questions.length, 0)} câu</span>
          </div>
        </header>

        <main class="content-area" data-swipe-zone="content">
          ${content}
        </main>
      </div>

      ${runtime.toast ? `<div class="toast">${runtime.toast}</div>` : ''}
      ${renderModal(appState, runtime)}
    </div>
  `;

  eventCleanups = bindEvents();
  mountWheelCanvas();
  restoreFocus(focusSnapshot);
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
  wheelCleanup?.();
  wheelCleanup = null;
}

function cleanupRenderLifecycle(): void {
  cleanupWheel();
  eventCleanups.forEach((cleanup) => cleanup());
  eventCleanups = [];
}

function mountWheelCanvas(): void {
  const runtime = appContext.getRuntimeState();
  if (runtime.tab !== 'spin') {
    return;
  }

  const appState = appContext.getAppState();
  const model = buildWheelModel(appState);
  wheelCleanup = WheelRenderer.setup('wheel-canvas', model);
}
