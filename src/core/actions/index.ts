import { App } from '@capacitor/app';
import { appContext } from '../state';
import { startQuestionTimer, stopQuestionTimer } from '../question-timer';
import { saveState, readJson, readHasSeenIntro } from '../../storage';
import type { AppState } from '../../types';
// Import explicit file to avoid TS module resolution ambiguity between
// `src/ui/components.ts` (file) and `src/ui/components/` (directory).
// Using the explicit extension helps the editor/tsserver resolve correctly on Windows.
import { render } from '../../ui';
import { clearEverything, parseExcelImport } from './import-actions';
import {
  openGiftModal,
  openNoticeModal,
  openQuestionModal,
  closeModal,
  toggleQuestionPause,
  chooseQuestionAnswer,
  submitQuestionAnswer,
  revealAnswer,
  updatePlayerAnswer,
  openQuestionReview,
} from './modal-actions';
import { currentCategory, ensureQuestionDraft, selectCategory, addCategory, renameCategory, deleteCategory } from './category-actions';
import {
  saveQuestionDraft,
  deleteQuestion,
  resetQuestionFlags,
  saveQuestionEdit,
  setQuestionFilter,
  setQuestionDraftType,
  updateQuestionDraft,
} from './question-actions';
import { spin } from './spin-actions';
import { stageSoundForEvent, confirmSoundUpload, cancelSoundUpload, clearSoundBinding, previewSoundEvent } from './sound-actions';
import { completeIntro, showIntro } from './intro-actions';

export { appContext };
export { clearEverything, parseExcelImport };
export {
  openGiftModal,
  openNoticeModal,
  openQuestionModal,
  closeModal,
  toggleQuestionPause,
  chooseQuestionAnswer,
  submitQuestionAnswer,
  revealAnswer,
  updatePlayerAnswer,
  openQuestionReview,
};
export { currentCategory, ensureQuestionDraft, selectCategory, addCategory, renameCategory, deleteCategory };
export { saveQuestionDraft, deleteQuestion, resetQuestionFlags, saveQuestionEdit, setQuestionFilter, setQuestionDraftType, updateQuestionDraft };
export { spin };
export { stageSoundForEvent, confirmSoundUpload, cancelSoundUpload, clearSoundBinding, previewSoundEvent };
export { completeIntro, showIntro };

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
    return await readJson<AppState | null>(key, null);
  });

  const hasSeenIntro = await readHasSeenIntro();
  const appState = appContext.getAppState();
  appContext.setRuntimeState({
    selectedCategoryId: appState.categories[0]?.id ?? null,
    showIntro: !hasSeenIntro,
  });
  ensureQuestionDraft(currentCategory());

  await setupUI();
  renderApp();

  const { KeepAwake } = await import('@capacitor-community/keep-awake');
  await KeepAwake.keepAwake().catch(() => undefined);

  void App.addListener('pause', () => {
    stopQuestionTimer();
  });

  void App.addListener('resume', () => {
    const runtime = appContext.getRuntimeState();
    const modal = runtime.modal;
    if (modal?.kind === 'question' && !modal.paused && !modal.revealed && modal.remaining > 0) {
      startQuestionTimer();
    }
  });
}
