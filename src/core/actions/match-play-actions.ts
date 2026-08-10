import {
  findQuestionById,
  isEssayQuestion,
  isMcqAnswerCorrect,
  isMcqQuestion,
  isMultipleMcqQuestion,
  toggleMcqPlayerSelection,
} from '../../data';
import type { MatchPlayState, MatchRoundId, MatchSession, Question } from '../../types';
import { appContext } from '../state';
import { soundManager } from '../sound-manager';
import { matchRemainingSeconds, startMatchTimer, stopMatchTimer } from '../match-timer';
import { syncSpinUi } from '../../utils/sync-spin-ui';
import { buildRound2ExamPacks, isMatchExamPackUsed, pickMatchQuestionsFromBank, pickMatchQuestionsFromCategoryAllowReset } from '../match-questions';
import { MATCH_ROUND_NAMES, buildRound3PackageQuotas } from '../../config/match';
import { collectUsedQuestionIds, markQuestionIdsInPools } from '../pool-manager';
import { showToast } from './shared';

function requireMatchSettings() {
  const match = appContext.getAppState().settings.match;
  if (!match) {
    throw new Error('settings.match missing after normalize');
  }
  return match;
}

/** Câu đã dùng persist (pool) ∪ session ván — dùng khi bốc đề. */
export function getMatchExcludeIds(sessionUsed: readonly string[] = []): string[] {
  return [...new Set([...collectUsedQuestionIds(appContext.getQuestionPools()), ...sessionUsed])];
}

/** Ghi câu đã hỏi vào pool persist (theo lĩnh vực). */
function persistUsedQuestionIds(questionIds: readonly string[]): void {
  const unique = [...new Set(questionIds.filter(Boolean))];
  if (unique.length === 0) {
    return;
  }

  const categories = appContext.getAppState().categories;
  const entries: Array<{ categoryId: string; questionId: string }> = [];
  for (const questionId of unique) {
    const question = findQuestionById(categories, questionId);
    if (question) {
      entries.push({ categoryId: question.categoryId, questionId: question.id });
    }
  }

  if (entries.length === 0) {
    return;
  }

  appContext.setQuestionPools((current) => markQuestionIdsInPools(current, entries));
}

function getPlayContext(): { session: MatchSession; play: MatchPlayState } | null {
  const session = appContext.getRuntimeState().matchSession;
  if (!session?.activePlay) {
    return null;
  }
  return { session, play: session.activePlay };
}

function patchPlay(session: MatchSession, play: MatchPlayState): void {
  appContext.setRuntimeState({
    matchSession: { ...session, activePlay: play },
  });
}

function currentQuestion(play: MatchPlayState): Question | null {
  const questionId = play.questionIds[play.currentIndex];
  if (!questionId) {
    return null;
  }
  return findQuestionById(appContext.getAppState().categories, questionId);
}

function pointsPerQuestionForRound(round: MatchRoundId, questionCount: number): number {
  if (round === 3 || questionCount <= 0) {
    return 0;
  }
  return 100 / questionCount;
}

function resolveSelectedRound3Package(play: MatchPlayState) {
  const match = requireMatchSettings();
  const packageId = play.selectedPackageId ?? match.round3DefaultPackageId;
  return match.round3Packages.find((item) => item.id === packageId) ?? match.round3Packages[0] ?? null;
}

function resolveDefaultRound3Package() {
  const match = requireMatchSettings();
  return (
    match.round3Packages.find((item) => item.id === match.round3DefaultPackageId) ??
    match.round3Packages[0] ??
    null
  );
}

/** Giây đã trôi từ lúc bắt đầu câu — caller phải đóng băng `remaining` trước khi chấm. */
function questionElapsedSec(play: MatchPlayState): number {
  if (play.timerSec <= 0) {
    return 0;
  }
  return Math.max(0, play.timerSec - play.remaining);
}

function applyScoreDelta(session: MatchSession, play: MatchPlayState, isCorrect: boolean): {
  play: MatchPlayState;
  session: MatchSession;
  pointsDelta: number;
} {
  let pointsDelta = 0;
  let round3PackageRemaining = session.round3PackageRemaining;

  if (play.round === 3) {
    const selected = resolveSelectedRound3Package(play);
    const selectedPoints = selected?.points ?? 0;
    const defaultPkg = resolveDefaultRound3Package();
    if (isCorrect) {
      const withinWindow = !selected || questionElapsedSec(play) <= selected.timerSec;
      pointsDelta = withinWindow ? selectedPoints : (defaultPkg?.points ?? selectedPoints);

      // Đúng trong cửa sổ với gói hạn mức → trừ 1 lần còn lại.
      if (
        withinWindow &&
        selected &&
        defaultPkg &&
        selected.id !== defaultPkg.id &&
        (round3PackageRemaining[selected.id] ?? 0) > 0
      ) {
        round3PackageRemaining = {
          ...round3PackageRemaining,
          [selected.id]: (round3PackageRemaining[selected.id] ?? 0) - 1,
        };
      }
    } else {
      pointsDelta = -selectedPoints;
    }
  } else {
    pointsDelta = isCorrect ? play.pointsPerQuestion : 0;
  }

  const nextRoundScore = Math.max(0, play.roundScore + pointsDelta);
  const nextPlay: MatchPlayState = {
    ...play,
    roundScore: nextRoundScore,
    lastIsCorrect: isCorrect,
    lastPointsDelta: pointsDelta,
    phase: 'revealed',
  };

  const questionId = play.questionIds[play.currentIndex];
  const usedQuestionIds =
    questionId && !session.usedQuestionIds.includes(questionId)
      ? [...session.usedQuestionIds, questionId]
      : [...session.usedQuestionIds];

  if (questionId) {
    persistUsedQuestionIds([questionId]);
  }

  return {
    play: nextPlay,
    session: { ...session, usedQuestionIds, round3PackageRemaining },
    pointsDelta,
  };
}

function playGradeSfx(isCorrect: boolean): void {
  soundManager.play(isCorrect ? 'correct' : 'wrong');
}

/** Bắt đầu đếm giờ câu (L3: chạy ngay từ lúc chọn gói / bắt đầu câu). */
function beginQuestionTimer(play: MatchPlayState, timerSec: number): MatchPlayState {
  const unlimited = timerSec <= 0;
  return {
    ...play,
    timerSec,
    deadlineAt: unlimited ? 0 : Date.now() + timerSec * 1000,
    remaining: unlimited ? 0 : timerSec,
  };
}

function beginAnswering(play: MatchPlayState, timerSec: number): MatchPlayState {
  return {
    ...beginQuestionTimer(play, timerSec),
    phase: 'answering',
    playerAnswer: '',
    lastIsCorrect: null,
    lastPointsDelta: 0,
  };
}

let packagePickTimeoutId: number | null = null;

function clearPackagePickTimeout(): void {
  if (packagePickTimeoutId !== null) {
    window.clearTimeout(packagePickTimeoutId);
    packagePickTimeoutId = null;
  }
}

/** Hết thời chọn gói → áp mặc định. */
function armPackagePickTimeout(): void {
  clearPackagePickTimeout();
  const match = requireMatchSettings();
  packagePickTimeoutId = window.setTimeout(() => {
    packagePickTimeoutId = null;
    const ctx = getPlayContext();
    if (!ctx || ctx.play.round !== 3 || ctx.play.phase !== 'picking-package') {
      return;
    }
    applyDefaultMatchPackage();
  }, match.round3PackagePickSec * 1000);
}

export function createEmptyMatchSession(currentRound: MatchRoundId = 1): MatchSession {
  return {
    currentRound,
    scores: { 1: 0, 2: 0, 3: 0 },
    usedQuestionIds: [],
    round2Packs: [],
    round3PackageRemaining: {},
    round3SourceMode: 'bank',
    round3CategoryId: null,
    activePlay: null,
    roundSummary: null,
    showFinalSummary: false,
  };
}

export type StartMatchPlayParams = {
  round: MatchRoundId;
  questionIds: string[];
  label: string;
  accentColor: string;
  /** Giữ session hiện có (điểm/used); null = tạo mới */
  existingSession?: MatchSession | null;
};

/** Bắt đầu phần thi dùng chung cho một lượt (L1/L2 → answering; L3 → picking-package). */
export function startMatchActivePlay(params: StartMatchPlayParams): void {
  if (params.questionIds.length === 0) {
    showToast('Không có câu hỏi để chơi');
    return;
  }

  stopMatchTimer();
  clearPackagePickTimeout();
  const match = requireMatchSettings();
  const baseSession = params.existingSession ?? createEmptyMatchSession(params.round);

  const pointsPerQuestion = pointsPerQuestionForRound(params.round, params.questionIds.length);
  const carriedScore =
    params.round === 3
      ? baseSession.scores[1] + baseSession.scores[2]
      : params.round === 2
        ? baseSession.scores[2]
        : 0;

  let play: MatchPlayState = {
    round: params.round,
    questionIds: [...params.questionIds],
    currentIndex: 0,
    roundScore: carriedScore,
    selectedPackageId: null,
    phase: params.round === 3 ? 'picking-package' : 'answering',
    pointsPerQuestion,
    label: params.label,
    accentColor: params.accentColor,
    timerSec: 0,
    deadlineAt: 0,
    remaining: 0,
    playerAnswer: '',
    lastIsCorrect: null,
    lastPointsDelta: 0,
  };

  if (params.round !== 3) {
    const timerSec = params.round === 1 ? match.round1TimerSec : match.round2TimerSec;
    play = beginAnswering(play, timerSec);
  } else {
    // L3: thanh giây chạy từ lúc bắt đầu câu (kể cả lúc chọn gói).
    play = beginQuestionTimer(play, match.round3TimerSec);
  }

  const round3PackageRemaining =
    params.round === 3
      ? { ...buildRound3PackageQuotas(match) }
      : baseSession.round3PackageRemaining;

  appContext.setRuntimeState({
    matchSession: {
      ...baseSession,
      currentRound: params.round,
      round3PackageRemaining,
      activePlay: play,
      roundSummary: null,
      showFinalSummary: false,
    },
  });
  syncSpinUi();

  if (play.phase === 'answering' || (play.phase === 'picking-package' && play.timerSec > 0)) {
    startMatchTimer();
  }
  if (play.phase === 'picking-package') {
    armPackagePickTimeout();
  }
}

export function closeMatchSession(): void {
  stopMatchTimer();
  clearPackagePickTimeout();
  appContext.setRuntimeState({ matchSession: null, confirmDialog: null, spinRoundView: 1 });
  syncSpinUi();
}

export function selectMatchPackage(packageId: string): void {
  const ctx = getPlayContext();
  if (!ctx || ctx.play.round !== 3 || ctx.play.phase !== 'picking-package') {
    return;
  }

  const match = requireMatchSettings();
  const pkg = match.round3Packages.find((item) => item.id === packageId);
  if (!pkg) {
    return;
  }

  const isDefault = pkg.id === match.round3DefaultPackageId;
  if (!isDefault && (ctx.session.round3PackageRemaining[pkg.id] ?? 0) <= 0) {
    showToast('Gói này đã hết lượt');
    return;
  }

  clearPackagePickTimeout();

  const remaining =
    ctx.play.deadlineAt > 0 ? matchRemainingSeconds(ctx.play.deadlineAt) : ctx.play.remaining;
  const nextPlay: MatchPlayState = {
    ...ctx.play,
    selectedPackageId: pkg.id,
    phase: 'answering',
    remaining,
    playerAnswer: '',
    lastIsCorrect: null,
    lastPointsDelta: 0,
  };

  if (ctx.play.timerSec > 0 && remaining <= 0) {
    patchPlay(ctx.session, nextPlay);
    handleMatchTimeUp();
    return;
  }

  patchPlay(ctx.session, nextPlay);
  startMatchTimer();
}

/** Áp gói mặc định rồi vào answering — khi MC không chọn / hết giờ chọn. */
export function applyDefaultMatchPackage(): void {
  const match = requireMatchSettings();
  selectMatchPackage(match.round3DefaultPackageId);
}

/** Màn luật L3 — Xác nhận bắt đầu: bank hoặc 1 lĩnh vực (thiếu → reset used lĩnh vực đó). */
export function confirmStartRound3(): void {
  const session = appContext.getRuntimeState().matchSession;
  if (
    !session ||
    session.currentRound !== 3 ||
    session.activePlay ||
    session.roundSummary ||
    session.showFinalSummary
  ) {
    return;
  }

  const match = requireMatchSettings();
  const categories = appContext.getAppState().categories;
  let questionIds: string[] = [];
  let label: string = MATCH_ROUND_NAMES[3];
  let accentColor = '#b42318';

  if (session.round3SourceMode === 'category') {
    const category = categories.find((item) => item.id === session.round3CategoryId);
    if (!category) {
      showToast('Chọn một lĩnh vực trước khi bắt đầu');
      return;
    }

    const picked = pickMatchQuestionsFromCategoryAllowReset(category, {
      count: match.round3QuestionCount,
      excludeIds: getMatchExcludeIds(session.usedQuestionIds),
    });

    if (picked.questions.length < picked.requested) {
      showToast(
        `Lĩnh vực "${category.name}" không đủ câu cho ${MATCH_ROUND_NAMES[3]} (cần ${picked.requested}, có ${category.questions.length})`,
      );
      return;
    }

    if (picked.resetApplied) {
      // Chỉ nới exclude lúc lấy đề — không xóa usedQuestionIds (tránh «Đã dùng» bị tụt).
      showToast(`Đã lấy thêm câu đã dùng trong "${category.name}" để đủ đề`);
    }

    questionIds = picked.questions.map((question) => question.id);
    label = category.name;
    accentColor = category.color;
  } else {
    const picked = pickMatchQuestionsFromBank(categories, {
      count: match.round3QuestionCount,
      excludeIds: getMatchExcludeIds(session.usedQuestionIds),
    });

    if (picked.questions.length < picked.requested) {
      showToast(
        `Không đủ câu hỏi cho ${MATCH_ROUND_NAMES[3]} (cần ${picked.requested} câu còn lại, hiện còn ${picked.available})`,
      );
      appContext.setRuntimeState({
        matchSession: {
          ...session,
          currentRound: 2,
          roundSummary: { round: 2, score: session.scores[2] },
          showFinalSummary: false,
        },
        spinRoundView: 2,
      });
      syncSpinUi();
      return;
    }

    questionIds = picked.questions.map((question) => question.id);
  }

  startMatchActivePlay({
    round: 3,
    questionIds,
    label,
    accentColor,
    existingSession: session,
  });
}

export function setMatchRound3SourceMode(mode: 'bank' | 'category'): void {
  const session = appContext.getRuntimeState().matchSession;
  if (!session || session.currentRound !== 3 || session.activePlay || session.showFinalSummary) {
    return;
  }

  const categories = appContext.getAppState().categories;
  const nextCategoryId =
    mode === 'category'
      ? session.round3CategoryId && categories.some((item) => item.id === session.round3CategoryId)
        ? session.round3CategoryId
        : (categories[0]?.id ?? null)
      : null;

  appContext.setRuntimeState({
    matchSession: {
      ...session,
      round3SourceMode: mode,
      round3CategoryId: nextCategoryId,
    },
  });
}

export function setMatchRound3Category(categoryId: string): void {
  const session = appContext.getRuntimeState().matchSession;
  if (!session || session.currentRound !== 3 || session.activePlay || session.showFinalSummary) {
    return;
  }
  if (session.round3SourceMode !== 'category') {
    return;
  }
  if (!appContext.getAppState().categories.some((item) => item.id === categoryId)) {
    return;
  }

  appContext.setRuntimeState({
    matchSession: {
      ...session,
      round3CategoryId: categoryId,
    },
  });
}

export function chooseMatchMcqAnswer(option: string): void {
  const ctx = getPlayContext();
  if (!ctx || ctx.play.phase !== 'answering') {
    return;
  }

  const question = currentQuestion(ctx.play);
  if (!question || !isMcqQuestion(question)) {
    return;
  }

  if (isMultipleMcqQuestion(question)) {
    const nextAnswer = toggleMcqPlayerSelection(ctx.play.playerAnswer, option, question);
    patchPlay(ctx.session, { ...ctx.play, playerAnswer: nextAnswer });
    return;
  }

  stopMatchTimer();
  const isCorrect = isMcqAnswerCorrect(option, question);
  const remaining =
    ctx.play.deadlineAt > 0 ? matchRemainingSeconds(ctx.play.deadlineAt) : ctx.play.remaining;
  const graded = applyScoreDelta(
    ctx.session,
    { ...ctx.play, playerAnswer: option, remaining },
    isCorrect,
  );
  appContext.setRuntimeState({ matchSession: { ...graded.session, activePlay: graded.play } });
  playGradeSfx(isCorrect);
  syncSpinUi();
}

/** MCQ nhiều đáp án — chốt lựa chọn hiện tại rồi chấm. */
export function confirmMatchMcqAnswer(): void {
  const ctx = getPlayContext();
  if (!ctx || ctx.play.phase !== 'answering') {
    return;
  }

  const question = currentQuestion(ctx.play);
  if (!question || !isMcqQuestion(question) || !isMultipleMcqQuestion(question)) {
    return;
  }

  if (!ctx.play.playerAnswer.trim()) {
    showToast('Chọn ít nhất một đáp án');
    return;
  }

  stopMatchTimer();
  const isCorrect = isMcqAnswerCorrect(ctx.play.playerAnswer, question);
  const remaining =
    ctx.play.deadlineAt > 0 ? matchRemainingSeconds(ctx.play.deadlineAt) : ctx.play.remaining;
  const graded = applyScoreDelta(ctx.session, { ...ctx.play, remaining }, isCorrect);
  appContext.setRuntimeState({ matchSession: { ...graded.session, activePlay: graded.play } });
  playGradeSfx(isCorrect);
  syncSpinUi();
}

/** Essay: MC báo đã trả lời xong / hết giờ → hiện đáp án, chờ Đúng/Sai. */
export function revealMatchEssayForJudging(): void {
  const ctx = getPlayContext();
  if (!ctx || ctx.play.phase !== 'answering') {
    return;
  }

  const question = currentQuestion(ctx.play);
  if (!question || !isEssayQuestion(question)) {
    return;
  }

  stopMatchTimer();
  const questionId = ctx.play.questionIds[ctx.play.currentIndex];
  const usedQuestionIds =
    questionId && !ctx.session.usedQuestionIds.includes(questionId)
      ? [...ctx.session.usedQuestionIds, questionId]
      : [...ctx.session.usedQuestionIds];

  if (questionId) {
    persistUsedQuestionIds([questionId]);
  }

  appContext.setRuntimeState({
    matchSession: {
      ...ctx.session,
      usedQuestionIds,
      activePlay: {
        ...ctx.play,
        phase: 'revealed',
        remaining: ctx.play.timerSec > 0 ? matchRemainingSeconds(ctx.play.deadlineAt) : 0,
        lastIsCorrect: null,
        lastPointsDelta: 0,
      },
    },
  });
  syncSpinUi();
}

export function judgeMatchEssay(isCorrect: boolean): void {
  const ctx = getPlayContext();
  if (!ctx || ctx.play.phase !== 'revealed' || ctx.play.lastIsCorrect !== null) {
    return;
  }

  const question = currentQuestion(ctx.play);
  if (!question || !isEssayQuestion(question)) {
    return;
  }

  const graded = applyScoreDelta(ctx.session, ctx.play, isCorrect);
  appContext.setRuntimeState({ matchSession: { ...graded.session, activePlay: graded.play } });
  playGradeSfx(isCorrect);
  syncSpinUi();
}

export function handleMatchTimeUp(): void {
  const ctx = getPlayContext();
  if (!ctx) {
    return;
  }

  // Hết giờ lúc chưa chọn gói → áp gói mặc định rồi chấm sai như màn 1/2.
  if (ctx.play.phase === 'picking-package' && ctx.play.round === 3) {
    clearPackagePickTimeout();
    const match = requireMatchSettings();
    const withDefault: MatchPlayState = {
      ...ctx.play,
      selectedPackageId: match.round3DefaultPackageId,
      phase: 'answering',
      remaining: 0,
    };
    patchPlay(ctx.session, withDefault);
    // fall through after re-read
  }

  const latest = getPlayContext();
  if (!latest || latest.play.phase !== 'answering') {
    return;
  }

  const question = currentQuestion(latest.play);
  if (!question) {
    return;
  }

  if (isEssayQuestion(question)) {
    showToast('Hết giờ — hiện đáp án để MC chấm');
    revealMatchEssayForJudging();
    return;
  }

  showToast('Hết giờ');
  stopMatchTimer();
  const frozen: MatchPlayState = {
    ...latest.play,
    remaining: 0,
  };
  const graded = applyScoreDelta(latest.session, { ...frozen, playerAnswer: '' }, false);
  appContext.setRuntimeState({ matchSession: { ...graded.session, activePlay: graded.play } });
  playGradeSfx(false);
  syncSpinUi();
}

function finishActivePlayRound(session: MatchSession, play: MatchPlayState): void {
  clearPackagePickTimeout();
  let roundScore = play.roundScore;
  if (play.round === 3) {
    // L3 roundScore đang mang cả điểm L1+L2; tách phần Lượt 3 (có thể âm)
    roundScore = play.roundScore - session.scores[1] - session.scores[2];
  }

  // An toàn: mọi câu trong lượt đều vào used (tránh sót khi chấm/timer lệch).
  const usedQuestionIds = [...new Set([...session.usedQuestionIds, ...play.questionIds])];
  persistUsedQuestionIds(play.questionIds);

  const nextScores = { ...session.scores, [play.round]: roundScore };
  appContext.setRuntimeState({
    matchSession: {
      ...session,
      scores: nextScores,
      usedQuestionIds,
      activePlay: null,
      roundSummary: { round: play.round, score: roundScore },
      showFinalSummary: false,
    },
  });
  syncSpinUi();
}

/** MC bấm tiếp sau màn tóm tắt lượt. */
export function continueAfterRoundSummary(): void {
  const session = appContext.getRuntimeState().matchSession;
  if (!session?.roundSummary || session.activePlay) {
    return;
  }

  const finishedRound = session.roundSummary.round;

  if (finishedRound === 1) {
    const match = requireMatchSettings();
    const built = buildRound2ExamPacks(appContext.getAppState().categories, {
      questionsPerPack: match.round2QuestionsPerPack,
      excludeIds: getMatchExcludeIds(session.usedQuestionIds),
    });

    if (built.packs.length === 0) {
      showToast(
        `Không đủ câu hỏi cho ${MATCH_ROUND_NAMES[2]} (cần ít nhất ${built.questionsPerPack} câu còn lại, hiện còn ${built.available})`,
      );
      return;
    }

    appContext.setRuntimeState({
      matchSession: {
        ...session,
        currentRound: 2,
        roundSummary: null,
        round2Packs: built.packs,
        showFinalSummary: false,
      },
      spinRoundView: 2,
    });
    syncSpinUi();
    return;
  }

  if (finishedRound === 2) {
    // Mỗi ván chỉ chơi một bộ đề Tổng hợp — xong là sang Về đích.
    proceedToRound3();
    return;
  }

  // Hết Về đích → màn tổng kết
  appContext.setRuntimeState({
    matchSession: {
      ...session,
      roundSummary: null,
      showFinalSummary: true,
    },
  });
  soundManager.play('fanfare');
  syncSpinUi();
}

/** MC chủ động sang Về đích (hoặc hết bộ Tổng hợp). */
export function proceedToRound3(): void {
  const session = appContext.getRuntimeState().matchSession;
  if (!session || session.activePlay || session.showFinalSummary) {
    return;
  }
  if (session.currentRound !== 2 && !(session.roundSummary?.round === 2)) {
    return;
  }

  const finishedAnyPack = session.round2Packs.some((pack) =>
    isMatchExamPackUsed(pack, session.usedQuestionIds),
  );
  // Chưa chơi bộ nào thì không cho nhảy màn 3 (câu used từ màn 1 không tính).
  if (session.round2Packs.length > 0 && !finishedAnyPack) {
    return;
  }

  appContext.setRuntimeState({
    matchSession: {
      ...session,
      currentRound: 3,
      round3SourceMode: 'bank',
      round3CategoryId: null,
      roundSummary: null,
      showFinalSummary: false,
    },
    spinRoundView: 3,
  });
  syncSpinUi();
}

/** Sang câu kế (sau khi đã chấm). L3: reset selectedPackageId trước picking-package. */
export function goToNextMatchQuestion(): void {
  const ctx = getPlayContext();
  if (!ctx || ctx.play.phase !== 'revealed') {
    return;
  }
  if (ctx.play.lastIsCorrect === null) {
    return;
  }

  const { session, play } = ctx;
  const nextIndex = play.currentIndex + 1;
  if (nextIndex >= play.questionIds.length) {
    // Đọc session mới nhất — tránh snapshot cũ làm mất usedQuestionIds vừa chấm.
    const live = appContext.getRuntimeState().matchSession;
    const livePlay = live?.activePlay;
    if (live && livePlay) {
      finishActivePlayRound(live, livePlay);
    }
    return;
  }

  const match = requireMatchSettings();
  let nextPlay: MatchPlayState = {
    ...play,
    currentIndex: nextIndex,
    playerAnswer: '',
    lastIsCorrect: null,
    lastPointsDelta: 0,
    /** Bắt buộc reset trước picking-package câu mới (L3) */
    selectedPackageId: null,
    timerSec: 0,
    deadlineAt: 0,
    remaining: 0,
  };

  if (play.round === 3) {
    nextPlay = beginQuestionTimer(
      { ...nextPlay, phase: 'picking-package' },
      match.round3TimerSec,
    );
    patchPlay(session, nextPlay);
    armPackagePickTimeout();
    startMatchTimer();
    return;
  }

  const timerSec = play.round === 1 ? match.round1TimerSec : match.round2TimerSec;
  nextPlay = beginAnswering(nextPlay, timerSec);
  patchPlay(session, nextPlay);
  startMatchTimer();
}
