import { App } from '@capacitor/app';
import { appContext } from '../state';
import { soundManager } from '../sound-manager';
import { matchRemainingSeconds, startMatchTimer, stopMatchTimer } from '../match-timer';
import { enqueuePersist, resetPersistErrorFlag } from '../persist-queue';
import { saveState, readJson, readPools, savePools } from '../../storage';
import { defaultQuestionDraft } from '../../data';
import { render } from '../../ui';
import { clearEverything, parseExcelImport } from './import-actions';
import { closeModal } from './modal-actions';
import { currentCategory, ensureQuestionDraft, selectCategory, addCategory, renameCategory, deleteCategory } from './category-actions';
import {
  saveQuestionDraft,
  deleteQuestion,
  saveQuestionEdit,
  setQuestionFilter,
  setQuestionDraftType,
  updateQuestionDraft,
} from './question-actions';
import { spin, spinMatchRound2 } from './spin-actions';
import {
  applyDefaultMatchPackage,
  chooseMatchMcqAnswer,
  closeMatchSession,
  confirmMatchMcqAnswer,
  confirmStartRound3,
  continueAfterRoundSummary,
  createEmptyMatchSession,
  goToNextMatchQuestion,
  handleMatchTimeUp,
  judgeMatchEssay,
  revealMatchEssayForJudging,
  selectMatchPackage,
  startMatchActivePlay,
} from './match-play-actions';
import { stageSoundForEvent, confirmSoundUpload, cancelSoundUpload, clearSoundBinding, previewSoundEvent } from './sound-actions';
import { completeIntro, showIntro } from './intro-actions';
import { consumeAndroidIntroResumeSuppression } from '../../utils/android-intro-resume';
import { isAndroidApp } from '../../utils/platform';
import { exportAppBackup, stageBackupImport } from './backup-actions';
import {
  cancelConfirmDialog,
  confirmDeleteCategoryFromMenu,
  confirmDialogAction,
  confirmRenameCategoryFromMenu,
  requestCategoryMenu,
  requestClearAllData,
  requestClearCategoryQuestions,
  requestDeleteCategory,
  requestDeleteQuestion,
  requestResetAllPools,
  requestResetCategoryPool,
} from './confirm-actions';

export { clearEverything, parseExcelImport };
export { exportAppBackup, stageBackupImport };
export { closeModal };
export { currentCategory, ensureQuestionDraft, selectCategory, addCategory, renameCategory, deleteCategory };
export { saveQuestionDraft, deleteQuestion, saveQuestionEdit, setQuestionFilter, setQuestionDraftType, updateQuestionDraft };
export { spin, spinMatchRound2 };
export {
  applyDefaultMatchPackage,
  chooseMatchMcqAnswer,
  closeMatchSession,
  confirmMatchMcqAnswer,
  confirmStartRound3,
  continueAfterRoundSummary,
  createEmptyMatchSession,
  goToNextMatchQuestion,
  handleMatchTimeUp,
  judgeMatchEssay,
  revealMatchEssayForJudging,
  selectMatchPackage,
  startMatchActivePlay,
};
export { stageSoundForEvent, confirmSoundUpload, cancelSoundUpload, clearSoundBinding, previewSoundEvent };
export { completeIntro, showIntro };
export {
  cancelConfirmDialog,
  confirmDeleteCategoryFromMenu,
  confirmDialogAction,
  confirmRenameCategoryFromMenu,
  requestCategoryMenu,
  requestClearAllData,
  requestClearCategoryQuestions,
  requestDeleteCategory,
  requestDeleteQuestion,
  requestResetAllPools,
  requestResetCategoryPool,
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

  appContext.subscribePoolsPersist(() => {
    enqueuePersist(() =>
      appContext.persistQuestionPools(async (pools) => {
        await savePools(pools);
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
    return await readJson(key, null);
  });

  if (appContext.getRuntimeState().showIntro) {
    renderApp();
  }

  await appContext.loadQuestionPools(readPools);

  appContext.patchRuntimeStateWithoutRender({
    questionDraft: defaultQuestionDraft(appContext.getRuntimeState().questionDraft.type),
  });

  const { KeepAwake } = await import('@capacitor-community/keep-awake');
  await KeepAwake.keepAwake().catch(() => undefined);

  void App.addListener('pause', () => {
    stopMatchTimer();
    soundManager.pauseAll();
    void KeepAwake.allowSleep().catch(() => undefined);
  });

  void App.addListener('resume', () => {
    void KeepAwake.keepAwake().catch(() => undefined);
    const runtime = appContext.getRuntimeState();

    if (isAndroidApp() && !runtime.showIntro && !consumeAndroidIntroResumeSuppression()) {
      requestAnimationFrame(() => showIntro());
      return;
    }

    const play = runtime.matchSession?.activePlay;
    if (play?.phase === 'answering' && play.timerSec > 0 && matchRemainingSeconds(play.deadlineAt) > 0) {
      startMatchTimer();
    }
  });
}
