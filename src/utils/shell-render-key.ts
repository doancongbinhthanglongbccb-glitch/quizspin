import { appContext } from '../core/state';
import type { RuntimeState } from '../core/state';
import type { AppState } from '../types';
import { SOUND_EVENT_KEYS } from '../config/sounds';
import { countUsedQuestionsInBank } from '../core/pool-manager';

/**
 * Chữ ký phần shell (nav + tab content). Chỉ rebuild shell khi đổi.
 * Chi tiết modal/toast/draft không nằm trong key.
 */
export function getShellRenderKey(appState: AppState, runtime: RuntimeState): string {
  const totalQuestions = appState.categories.reduce((count, category) => count + category.questions.length, 0);
  const categoryCount = appState.categories.length;

  const base = [runtime.tab, totalQuestions, categoryCount].join('|');

  if (runtime.tab === 'bank') {
    const categoriesSig = appState.categories
      .map((category) => `${category.id}:${category.name}:${category.questions.map((q) => q.id).join('.')}`)
      .join(',');

    return [
      base,
      runtime.selectedCategoryId ?? '',
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
    const match = appState.settings.match;
    const matchSig = match
      ? [
          match.round1QuestionCount,
          match.round1TimerSec,
          match.round2QuestionsPerPack,
          match.round2TimerSec,
          match.round3QuestionCount,
          match.round3TimerSec,
          match.round3PackagePickSec,
          match.round3DefaultPackageId,
          match.round3Packages.map((pkg) => `${pkg.id}:${pkg.points}:${pkg.timerSec}`).join(','),
        ].join('|')
      : '';
    const usedPersist = countUsedQuestionsInBank(appContext.getQuestionPools(), appState.categories);

    return [
      base,
      runtime.settingsSection,
      appState.settings.timer,
      appState.settings.sound ? '1' : '0',
      appState.settings.sounds?.library.length ?? 0,
      bindingsSig,
      runtime.soundUploadDraft?.eventKey ?? '',
      matchSig,
      usedPersist,
    ].join('|');
  }

  if (runtime.tab === 'spin') {
    const wheelSig = appState.categories.map((c) => `${c.id}:${c.name}:${c.color}`).join(',');
    const match = runtime.matchSession;
    const matchSig = match
      ? [
          match.currentRound,
          match.round2Packs.map((pack) => pack.id).join(','),
          // Idle mới đưa used vào key → rebuild bánh xe. Đang chơi: chỉ sync label qua syncSpinUi.
          match.activePlay ? 'play' : match.usedQuestionIds.join(','),
          match.activePlay ? '1' : '0',
          match.roundSummary ? `s${match.roundSummary.round}` : '',
          match.showFinalSummary ? '1' : '0',
          match.round3SourceMode,
          match.round3CategoryId ?? '',
          Math.round(match.scores[1] * 100),
          Math.round(match.scores[2] * 100),
        ].join('|')
      : '';
    const packagesSig =
      appState.settings.match?.round3Packages.map((pkg) => `${pkg.id}:${pkg.points}:${pkg.timerSec}`).join(',') ??
      '';
    // Idle mới đưa used persist vào key. Đang chơi: syncSpinUi cập nhật label, tránh rebuild bánh.
    const usedPersist = runtime.matchSession?.activePlay
      ? 'play'
      : String(countUsedQuestionsInBank(appContext.getQuestionPools(), appState.categories));
    return [base, wheelSig, runtime.spinRoundView, matchSig, packagesSig, usedPersist].join('|');
  }

  return base;
}
