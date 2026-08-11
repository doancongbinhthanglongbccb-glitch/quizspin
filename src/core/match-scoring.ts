import type {
  MatchPlayState,
  MatchRoundId,
  MatchScorePackage,
  MatchSession,
} from '../types';

/** Điểm mỗi câu L1/L2 — L3 dùng gói nên = 0. */
export function pointsPerQuestionForRound(round: MatchRoundId, questionCount: number): number {
  if (round === 3 || questionCount <= 0) {
    return 0;
  }
  return 100 / questionCount;
}

/** Giây đã trôi từ lúc bắt đầu trả lời — caller đóng băng `remaining` trước khi chấm. */
export function questionElapsedSec(play: Pick<MatchPlayState, 'timerSec' | 'remaining'>): number {
  if (play.timerSec <= 0) {
    return 0;
  }
  return Math.max(0, play.timerSec - play.remaining);
}

export function resolveMatchPackage(
  packages: readonly MatchScorePackage[],
  defaultPackageId: string,
  selectedPackageId: string | null,
): MatchScorePackage | null {
  const packageId = selectedPackageId ?? defaultPackageId;
  return packages.find((item) => item.id === packageId) ?? packages[0] ?? null;
}

export function resolveDefaultMatchPackage(
  packages: readonly MatchScorePackage[],
  defaultPackageId: string,
): MatchScorePackage | null {
  return packages.find((item) => item.id === defaultPackageId) ?? packages[0] ?? null;
}

export type MatchPointsDeltaInput = {
  round: MatchRoundId;
  isCorrect: boolean;
  pointsPerQuestion: number;
  elapsedSec: number;
  selectedPackage: MatchScorePackage | null;
  defaultPackage: MatchScorePackage | null;
  packageRemaining: Record<string, number>;
};

export type MatchPointsDeltaResult = {
  pointsDelta: number;
  /** Gói hạn mức cần trừ 1 lượt (chỉ khi đúng trong cửa sổ). */
  consumePackageId: string | null;
};

/** Tính điểm một câu — thuần, không side-effect. */
export function computeMatchPointsDelta(input: MatchPointsDeltaInput): MatchPointsDeltaResult {
  if (input.round === 3) {
    const selectedPoints = input.selectedPackage?.points ?? 0;
    if (!input.isCorrect) {
      return { pointsDelta: -selectedPoints, consumePackageId: null };
    }

    const withinWindow =
      !input.selectedPackage || input.elapsedSec <= input.selectedPackage.timerSec;
    const pointsDelta = withinWindow
      ? selectedPoints
      : (input.defaultPackage?.points ?? selectedPoints);

    const canConsume =
      withinWindow &&
      input.selectedPackage &&
      input.defaultPackage &&
      input.selectedPackage.id !== input.defaultPackage.id &&
      (input.packageRemaining[input.selectedPackage.id] ?? 0) > 0;

    return {
      pointsDelta,
      consumePackageId: canConsume ? input.selectedPackage!.id : null,
    };
  }

  return {
    pointsDelta: input.isCorrect ? input.pointsPerQuestion : 0,
    consumePackageId: null,
  };
}

/**
 * Áp điểm + revealed + usedQuestionIds trong session.
 * Không ghi pool persist — caller gọi persist riêng.
 */
export function applyMatchScoreDelta(
  session: MatchSession,
  play: MatchPlayState,
  isCorrect: boolean,
  packages: readonly MatchScorePackage[],
  defaultPackageId: string,
): {
  play: MatchPlayState;
  session: MatchSession;
  pointsDelta: number;
} {
  const selectedPackage = resolveMatchPackage(packages, defaultPackageId, play.selectedPackageId);
  const defaultPackage = resolveDefaultMatchPackage(packages, defaultPackageId);
  const { pointsDelta, consumePackageId } = computeMatchPointsDelta({
    round: play.round,
    isCorrect,
    pointsPerQuestion: play.pointsPerQuestion,
    elapsedSec: questionElapsedSec(play),
    selectedPackage,
    defaultPackage,
    packageRemaining: session.round3PackageRemaining,
  });

  let round3PackageRemaining = session.round3PackageRemaining;
  if (consumePackageId) {
    round3PackageRemaining = {
      ...round3PackageRemaining,
      [consumePackageId]: (round3PackageRemaining[consumePackageId] ?? 0) - 1,
    };
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
    session: { ...session, usedQuestionIds, round3PackageRemaining },
    pointsDelta,
  };
}

/** Bắt đầu đếm giờ câu (chỉ khi đang trả lời). */
export function beginQuestionTimer(play: MatchPlayState, timerSec: number, now = Date.now()): MatchPlayState {
  const unlimited = timerSec <= 0;
  return {
    ...play,
    timerSec,
    deadlineAt: unlimited ? 0 : now + timerSec * 1000,
    remaining: unlimited ? 0 : timerSec,
  };
}

export function beginAnswering(play: MatchPlayState, timerSec: number, now = Date.now()): MatchPlayState {
  return {
    ...beginQuestionTimer(play, timerSec, now),
    phase: 'answering',
    playerAnswer: '',
    lastIsCorrect: null,
    lastPointsDelta: 0,
  };
}
