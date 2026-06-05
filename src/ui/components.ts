import { appContext } from '../core/state';
import { buildWheelModel } from '../core/wheel';
import { renderModal } from './components/modal';
import { renderSpinTab } from './components/spin-tab';
import { renderBankTab } from './components/bank-tab';
import { renderSettingsTab } from './components/settings-tab';
import { WheelRenderer } from './components/wheel';
import { bindSpinHandlers, bindBankHandlers, bindModalHandlers, bindSettingsHandlers } from './handlers';

const appRoot = document.querySelector<HTMLDivElement>('#app')!;
let wheelCleanup: (() => void) | null = null;
let eventCleanups: Array<() => void> = [];

if (!appRoot) {
  throw new Error('Missing app root');
}

function renderTabs(): string {
  const runtime = appContext.getRuntimeState();
  const button = (key: 'spin' | 'bank' | 'settings', label: string) =>
    `<button class="nav-tab ${runtime.tab === key ? 'nav-tab--active' : ''}" data-action="switch-tab" data-tab="${key}">${label}</button>`;

  return `
    <nav class="nav-shell">
      ${button('spin', 'Vòng quay')}
      ${button('bank', 'Ngân hàng')}
      ${button('settings', 'Cài đặt')}
    </nav>
  `;
}

export function render(): void {
  const appState = appContext.getAppState();
  const runtime = appContext.getRuntimeState();
  const content = runtime.tab === 'spin' ? renderSpinTab(appState, runtime) : runtime.tab === 'bank' ? renderBankTab(appState, runtime) : renderSettingsTab(appState);

  cleanupRenderLifecycle();

  appRoot.innerHTML = `
    <div class="app-shell">
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

      ${renderTabs()}

      <main class="content-area">
        ${content}
      </main>

      ${runtime.toast ? `<div class="toast">${runtime.toast}</div>` : ''}
      ${renderModal(appState, runtime)}
    </div>
  `;

  eventCleanups = bindEvents();
  mountWheelCanvas();
}

function bindEvents(): Array<() => void> {
  return [
    bindNavigationEvents(),
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
