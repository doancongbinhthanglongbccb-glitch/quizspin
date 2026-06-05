import { App } from '@capacitor/app';
import { appContext } from '../state';
import { saveState, readJson } from '../../storage';
// Import explicit file to avoid TS module resolution ambiguity between
// `src/ui/components.ts` (file) and `src/ui/components/` (directory).
// Using the explicit extension helps the editor/tsserver resolve correctly on Windows.
import { render } from '../../ui';
import { clearEverything, parseExcelImport } from './import-actions';
import { openGiftModal, openNoticeModal, openQuestionModal, closeModal, toggleQuestionPause, revealAnswer, chooseQuestionAnswer } from './modal-actions';
import { currentCategory, ensureQuestionDraft, selectCategory, addCategory, renameCategory, deleteCategory } from './category-actions';
import { saveQuestionDraft, deleteQuestion, resetQuestionFlags, saveQuestionEdit } from './question-actions';
import { spin } from './spin-actions';

export { appContext };
export { clearEverything, parseExcelImport };
export { openGiftModal, openNoticeModal, openQuestionModal, closeModal, toggleQuestionPause, revealAnswer, chooseQuestionAnswer };
export { currentCategory, ensureQuestionDraft, selectCategory, addCategory, renameCategory, deleteCategory };
export { saveQuestionDraft, deleteQuestion, resetQuestionFlags, saveQuestionEdit };
export { spin };

export let renderApp: () => void = render;

export async function setupUI(): Promise<void> {
  renderApp = render;

  appContext.subscribe(() => {
    renderApp();
  });

  // Persist app state whenever it changes. appContext.persistAppState expects
  // a saver with signature (key: string, value: AppState) => Promise<void>.
  // `saveState` has signature (state: AppState) => Promise<void>, so wrap it.
  appContext.subscribe(() => {
    void appContext
      .persistAppState(async (_key, value) => {
        // Delegate to saveState which writes the atomic 'appState' key.
        await saveState(value);
      })
      .catch(() => undefined);
  });
}

export async function bootstrap(): Promise<void> {
  await appContext.loadFromStorage(async (key) => {
    return await readJson<any>(key, null);
  });

  const appState = appContext.getAppState();
  appContext.setRuntimeState({
    selectedCategoryId: appState.categories[0]?.id ?? null,
  });
  ensureQuestionDraft(currentCategory());

  await setupUI();
  renderApp();

  const { KeepAwake } = await import('@capacitor-community/keep-awake');
  await KeepAwake.keepAwake().catch(() => undefined);

  void App.addListener('pause', () => {
    // Timer được quản lý ở shared.ts thông qua render cycle; tạm thời không cần xử lý thêm.
  });

  void App.addListener('resume', () => {
    // Khi resume sẽ render lại qua state subscription nếu cần.
  });
}
