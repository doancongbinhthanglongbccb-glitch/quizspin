import type { RuntimeState } from '../core/state';
import type { AppState } from '../types';
import { SOUND_EVENT_KEYS } from '../config/sounds';

/**
 * Chữ ký phần shell (nav + tab content). Chỉ rebuild shell khi đổi.
 * Chi tiết modal/toast/draft không nằm trong key.
 */
export function getShellRenderKey(appState: AppState, runtime: RuntimeState): string {
  const totalQuestions = appState.categories.reduce((count, category) => count + category.questions.length, 0);
  const categoryCount = appState.categories.length;
  const giftsReady = appState.settings.gifts.length > 0;
  const punishmentsReady = appState.settings.punishments.length > 0;

  const base = [
    runtime.tab,
    giftsReady && punishmentsReady ? '1' : '0',
    totalQuestions,
    categoryCount,
  ].join('|');

  if (runtime.tab === 'bank') {
    const categoriesSig = appState.categories
      .map((category) => `${category.id}:${category.name}:${category.questions.map((q) => q.id).join('.')}`)
      .join(',');

    return [
      base,
      runtime.selectedCategoryId ?? '',
      runtime.questionFilter,
      runtime.editingQuestionId ?? '',
      runtime.bankFormOpen ? '1' : '0',
      runtime.bankFormOpen ? runtime.questionDraft.type : '',
      runtime.importReport ? `${runtime.importReport.imported}/${runtime.importReport.skipped}` : '',
      categoriesSig,
    ].join('|');
  }

  if (runtime.tab === 'settings') {
    const bindings = appState.settings.sounds?.bindings ?? {};
    const bindingsSig = SOUND_EVENT_KEYS.map((key) => bindings[key] ?? '').join('|');

    return [
      base,
      runtime.settingsSection,
      appState.settings.timer,
      appState.settings.sound ? '1' : '0',
      appState.settings.gifts.length,
      appState.settings.punishments.length,
      appState.settings.sounds?.library.length ?? 0,
      bindingsSig,
      runtime.soundUploadDraft?.eventKey ?? '',
    ].join('|');
  }

  if (runtime.tab === 'spin') {
    const wheelSig = appState.categories.map((c) => `${c.id}:${c.name}:${c.color}`).join(',');
    return [base, wheelSig].join('|');
  }

  return base;
}
