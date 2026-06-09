import { App } from '@capacitor/app';
import { appContext } from '../state';
import { questionRemainingSeconds, startQuestionTimer, stopQuestionTimer } from '../question-timer';
import { enqueuePersist, resetPersistErrorFlag } from '../persist-queue';
import { saveState, readJson } from '../../storage';
import { defaultQuestionDraft } from '../../data';
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
  closeModalIfQuestionMissing,
  toggleQuestionPause,
  chooseQuestionAnswer,
  submitQuestionAnswer,
  revealAnswer,
  updatePlayerAnswer,
  finishQuestionPrepare,
  skipQuestionPrepare,
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
import { consumeAndroidIntroResumeSuppression } from '../../utils/android-intro-resume';
import { isAndroidApp } from '../../utils/platform';
import {
  cancelConfirmDialog,
  confirmDeleteCategoryFromMenu,
  confirmDialogAction,
  confirmRenameCategoryFromMenu,
  requestCategoryMenu,
  requestClearAllData,
  requestDeleteCategory,
  requestDeleteQuestion,
} from './confirm-actions';

export { clearEverything, parseExcelImport };
export {
  openGiftModal,
  openNoticeModal,
  openQuestionModal,
  closeModal,
  closeModalIfQuestionMissing,
  toggleQuestionPause,
  chooseQuestionAnswer,
  submitQuestionAnswer,
  revealAnswer,
  updatePlayerAnswer,
  finishQuestionPrepare,
  skipQuestionPrepare,
};
export { currentCategory, ensureQuestionDraft, selectCategory, addCategory, renameCategory, deleteCategory };
export { saveQuestionDraft, deleteQuestion, resetQuestionFlags, saveQuestionEdit, setQuestionFilter, setQuestionDraftType, updateQuestionDraft };
export { spin };
export { stageSoundForEvent, confirmSoundUpload, cancelSoundUpload, clearSoundBinding, previewSoundEvent };
export { completeIntro, showIntro };
export {
  cancelConfirmDialog,
  confirmDeleteCategoryFromMenu,
  confirmDialogAction,
  confirmRenameCategoryFromMenu,
  requestCategoryMenu,
  requestClearAllData,
  requestDeleteCategory,
  requestDeleteQuestion,
};

export let renderApp: () => void = render;

export async function setupUI(): Promise<void> {
  renderApp = render;

  appContext.subscribe(() => {
    renderApp();
  });

  appContext.subscribePersist(() => {
    enqueuePersist(() =>
      appContext.persistAppState(async (_key, value) => {
        await saveState(value);
      }),
    );
  });
}

export async function bootstrap(): Promise<void> {
  resetPersistErrorFlag();

  appContext.patchRuntimeStateWithoutRender({ showIntro: true });

  await setupUI();
  renderApp();

  await appContext.loadFromStorage(async (key) => {
    return await readJson<AppState | null>(key, null);
  });

  appContext.patchRuntimeStateWithoutRender({
    questionDraft: defaultQuestionDraft(appContext.getRuntimeState().questionDraft.type),
  });

  const { KeepAwake } = await import('@capacitor-community/keep-awake');
  await KeepAwake.keepAwake().catch(() => undefined);

  void App.addListener('pause', () => {
    stopQuestionTimer();
    void KeepAwake.allowSleep().catch(() => undefined);
  });

  void App.addListener('resume', () => {
    void KeepAwake.keepAwake().catch(() => undefined);
    const runtime = appContext.getRuntimeState();

    // Android: thoát app rồi mở lại → intro + nhạc (bỏ qua sau file picker / browser)
    if (isAndroidApp() && !runtime.showIntro && !consumeAndroidIntroResumeSuppression()) {
      requestAnimationFrame(() => showIntro());
      return;
    }

    const modal = runtime.modal;
    if (
      modal?.kind === 'question' &&
      !modal.paused &&
      !modal.revealed &&
      !modal.isPreparing &&
      questionRemainingSeconds(modal.deadlineAt) > 0
    ) {
      startQuestionTimer();
    }
  });
}
