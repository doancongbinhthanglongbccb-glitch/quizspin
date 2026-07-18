import { appContext, createDefaultRuntimeState } from '../state';
import {
  backupFilename,
  buildBackupPayload,
  downloadBackupJson,
  parseBackupPayload,
  type BackupPayload,
} from '../backup';
import { ensureQuestionDraft, currentCategory } from './category-actions';
import { closeModal } from './modal-actions';
import { closeQuizSession } from './quiz-actions';
import { closeExamPicker } from './exam-actions';
import { showToast, stopTimer } from './shared';

let pendingBackup: BackupPayload | null = null;

export async function exportAppBackup(): Promise<void> {
  const payload = buildBackupPayload(appContext.getAppState(), appContext.getQuestionPools());
  const questionCount = payload.appState.categories.reduce((sum, item) => sum + item.questions.length, 0);
  const summary = `${payload.appState.categories.length} lĩnh vực, ${questionCount} câu`;

  try {
    await downloadBackupJson(backupFilename(), payload);
    showToast(`Đã xuất backup (${summary})`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/cancel|abort|dismiss/i.test(message)) {
      return;
    }
    showToast('Không xuất được backup trên máy này');
  }
}

export function stageBackupImport(file: File): void {
  const reader = new FileReader();
  reader.onerror = () => showToast('Không đọc được file backup');
  reader.onload = () => {
    try {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const parsed = parseBackupPayload(JSON.parse(text) as unknown);
      if (!parsed.ok) {
        showToast(parsed.error);
        pendingBackup = null;
        return;
      }

      pendingBackup = parsed.payload;
      const questionCount = parsed.payload.appState.categories.reduce(
        (sum, item) => sum + item.questions.length,
        0,
      );
      appContext.setRuntimeState({
        confirmDialog: {
          kind: 'import-backup',
          categoryCount: parsed.payload.appState.categories.length,
          questionCount,
        },
      });
    } catch {
      pendingBackup = null;
      showToast('File backup không phải JSON hợp lệ');
    }
  };
  reader.readAsText(file);
}

export function clearPendingBackup(): void {
  pendingBackup = null;
}

export function applyPendingBackup(): boolean {
  if (!pendingBackup) {
    showToast('Không có backup đang chờ nhập');
    return false;
  }

  const payload = pendingBackup;
  pendingBackup = null;

  stopTimer();
  closeQuizSession();
  closeModal();
  closeExamPicker();

  const tab = appContext.getRuntimeState().tab;
  const settingsSection = appContext.getRuntimeState().settingsSection;

  appContext.setAppStateWithoutRender(payload.appState);
  appContext.setQuestionPools(payload.pools);

  const nextState = appContext.getAppState();
  appContext.setRuntimeState({
    ...createDefaultRuntimeState(),
    tab,
    settingsSection,
    selectedCategoryId: nextState.categories[0]?.id ?? null,
    showIntro: false,
  });
  ensureQuestionDraft(currentCategory());

  const questionCount = nextState.categories.reduce((sum, item) => sum + item.questions.length, 0);
  showToast(`Đã nhập backup (${nextState.categories.length} lĩnh vực, ${questionCount} câu)`);
  return true;
}
