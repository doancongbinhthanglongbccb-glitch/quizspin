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
import { buildRound2ExamPacks, pickMatchQuestionsFromBank } from '../match-questions';
import { showToast } from './shared';

function requireMatchSettings() {
  const match = appContext.getAppState().settings.match;
  if (!match) {
    throw new Error('settings.match missing after normalize');
  }
  return match;
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

function resolveRound3PackagePoints(play: MatchPlayState): number {
  const match = requireMatchSettings();
  const packageId = play.selectedPackageId ?? match.round3DefaultPackageId;
  const pkg = match.round3Packages.find((item) => item.id === packageId) ?? match.round3Packages[0];
  return pkg?.points ?? 0;
}

function applyScoreDelta(session: MatchSession, play: MatchPlayState, isCorrect: boolean): {
  play: MatchPlayState;
  session: MatchSession;
  pointsDelta: number;
} {
  let pointsDelta = 0;
  if (play.round === 3) {
    const packagePoints = resolveRound3PackagePoints(play);
    pointsDelta = isCorrect ? packagePoints : -packagePoints;
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

  return {
    play: nextPlay,
    session: { ...session, usedQuestionIds },
    pointsDelta,
  };
}

function playGradeSfx(isCorrect: boolean): void {
  soundManager.play(isCorrect ? 'correct' : 'wrong');
}

function beginAnswering(play: MatchPlayState, timerSec: number): MatchPlayState {
  const unlimited = timerSec <= 0;
  return {
    ...play,
    phase: 'answering',
    timerSec,
    deadlineAt: unlimited ? 0 : Date.now() + timerSec * 1000,
    remaining: unlimited ? 0 : timerSec,
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
    params.round === 3 ? baseSession.scores[1] + baseSession.scores[2] : 0;

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
  }

  appContext.setRuntimeState({
    matchSession: {
      ...baseSession,
      currentRound: params.round,
      activePlay: play,
      roundSummary: null,
      showFinalSummary: false,
    },
  });
  syncSpinUi();

  if (play.phase === 'answering') {
    startMatchTimer();
  } else if (play.phase === 'picking-package') {
    armPackagePickTimeout();
  }
}

export function closeMatchSession(): void {
  stopMatchTimer();
  clearPackagePickTimeout();
  appContext.setRuntimeState({ matchSession: null, confirmDialog: null });
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

  clearPackagePickTimeout();
  const play = beginAnswering(
    { ...ctx.play, selectedPackageId: pkg.id },
    pkg.timerSec,
  );
  patchPlay(ctx.session, play);
  startMatchTimer();
}

/** Áp gói mặc định rồi vào answering — khi MC không chọn / hết giờ chọn. */
export function applyDefaultMatchPackage(): void {
  const match = requireMatchSettings();
  selectMatchPackage(match.round3DefaultPackageId);
}

/** Màn luật L3 — Xác nhận bắt đầu: pick từ bank, thiếu câu → toast + trả về summary L2. */
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
  const picked = pickMatchQuestionsFromBank(appContext.getAppState().categories, {
    count: match.round3QuestionCount,
    excludeIds: session.usedQuestionIds,
  });

  if (picked.questions.length < picked.requested) {
    showToast(
      `Không đủ câu hỏi cho Lượt 3 (cần ${picked.requested} câu còn lại, hiện còn ${picked.available})`,
    );
    appContext.setRuntimeState({
      matchSession: {
        ...session,
        currentRound: 2,
        roundSummary: { round: 2, score: session.scores[2] },
        showFinalSummary: false,
      },
    });
    syncSpinUi();
    return;
  }

  startMatchActivePlay({
    round: 3,
    questionIds: picked.questions.map((q) => q.id),
    label: 'Lượt 3',
    accentColor: '#b42318',
    existingSession: session,
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
  const graded = applyScoreDelta(ctx.session, { ...ctx.play, playerAnswer: option }, isCorrect);
  appContext.setRuntimeState({ matchSession: { ...graded.session, activePlay: graded.play } });
  playGradeSfx(isCorrect);
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
  const graded = applyScoreDelta(ctx.session, ctx.play, isCorrect);
  appContext.setRuntimeState({ matchSession: { ...graded.session, activePlay: graded.play } });
  playGradeSfx(isCorrect);
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
}

export function handleMatchTimeUp(): void {
  const ctx = getPlayContext();
  if (!ctx || ctx.play.phase !== 'answering') {
    return;
  }

  const question = currentQuestion(ctx.play);
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
  const graded = applyScoreDelta(ctx.session, { ...ctx.play, playerAnswer: '' }, false);
  appContext.setRuntimeState({ matchSession: { ...graded.session, activePlay: graded.play } });
  playGradeSfx(false);
}

function finishActivePlayRound(session: MatchSession, play: MatchPlayState): void {
  clearPackagePickTimeout();
  let roundScore = play.roundScore;
  if (play.round === 3) {
    // L3 roundScore đang mang cả điểm L1+L2; tách phần Lượt 3 (có thể âm)
    roundScore = play.roundScore - session.scores[1] - session.scores[2];
  }

  const nextScores = { ...session.scores, [play.round]: roundScore };
  appContext.setRuntimeState({
    matchSession: {
      ...session,
      scores: nextScores,
      activePlay: null,
      roundSummary: { round: play.round, score: roundScore },
      showFinalSummary: false,
    },
  });
  syncSpinUi();
}

/** MC bấm Tiếp tục sau màn tóm tắt lượt. */
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
      excludeIds: session.usedQuestionIds,
    });

    if (built.packs.length === 0) {
      showToast(
        `Không đủ câu hỏi cho Lượt 2 (cần ít nhất ${built.questionsPerPack} câu còn lại, hiện còn ${built.available})`,
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
    });
    syncSpinUi();
    return;
  }

  if (finishedRound === 2) {
    appContext.setRuntimeState({
      matchSession: {
        ...session,
        currentRound: 3,
        roundSummary: null,
        showFinalSummary: false,
      },
    });
    syncSpinUi();
    return;
  }

  // Hết Lượt 3 → màn tổng kết
  appContext.setRuntimeState({
    matchSession: {
      ...session,
      roundSummary: null,
      showFinalSummary: true,
    },
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
    finishActivePlayRound(session, play);
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
    nextPlay = { ...nextPlay, phase: 'picking-package' };
    patchPlay(session, nextPlay);
    armPackagePickTimeout();
    return;
  }

  const timerSec = play.round === 1 ? match.round1TimerSec : match.round2TimerSec;
  nextPlay = beginAnswering(nextPlay, timerSec);
  patchPlay(session, nextPlay);
  startMatchTimer();
}
