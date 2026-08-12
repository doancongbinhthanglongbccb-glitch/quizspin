import { describe, expect, it } from 'vitest';
import {
  applyMatchScoreDelta,
  beginAnswering,
  computeMatchPointsDelta,
  computeMatchRunningTotal,
  pointsPerQuestionForRound,
  questionElapsedSec,
} from './match-scoring';
import type { MatchPlayState, MatchScorePackage, MatchSession } from '../types';

const packages: MatchScorePackage[] = [
  { id: 'low', points: 10, timerSec: 20 },
  { id: 'mid', points: 20, timerSec: 15 },
  { id: 'high', points: 30, timerSec: 10 },
];

function basePlay(overrides: Partial<MatchPlayState> = {}): MatchPlayState {
  return {
    round: 3,
    questionIds: ['q1'],
    currentIndex: 0,
    roundScore: 0,
    selectedPackageId: 'mid',
    phase: 'answering',
    pointsPerQuestion: 0,
    label: 'Về đích',
    accentColor: '#b42318',
    timerSec: 30,
    deadlineAt: Date.now() + 30_000,
    remaining: 30,
    playerAnswer: '',
    lastIsCorrect: null,
    lastPointsDelta: 0,
    ...overrides,
  };
}

function baseSession(overrides: Partial<MatchSession> = {}): MatchSession {
  return {
    currentRound: 3,
    scores: { 1: 40, 2: 60, 3: 0 },
    usedQuestionIds: [],
    round2Packs: [],
    round3PackageRemaining: { mid: 2, high: 1 },
    round3SourceMode: 'bank',
    round3CategoryId: null,
    activePlay: null,
    roundSummary: null,
    showFinalSummary: false,
    ...overrides,
  };
}

describe('pointsPerQuestionForRound', () => {
  it('splits 100 across L1/L2 questions', () => {
    expect(pointsPerQuestionForRound(1, 5)).toBe(20);
    expect(pointsPerQuestionForRound(2, 4)).toBe(25);
  });

  it('is 0 for L3 or empty', () => {
    expect(pointsPerQuestionForRound(3, 5)).toBe(0);
    expect(pointsPerQuestionForRound(1, 0)).toBe(0);
  });
});

describe('questionElapsedSec', () => {
  it('uses timerSec - remaining', () => {
    expect(questionElapsedSec({ timerSec: 30, remaining: 22 })).toBe(8);
  });

  it('is 0 when unlimited', () => {
    expect(questionElapsedSec({ timerSec: 0, remaining: 0 })).toBe(0);
  });
});

describe('computeMatchPointsDelta L3', () => {
  const mid = packages[1]!;
  const low = packages[0]!;

  it('awards package points when correct within window', () => {
    const result = computeMatchPointsDelta({
      round: 3,
      isCorrect: true,
      pointsPerQuestion: 0,
      elapsedSec: 10,
      selectedPackage: mid,
      defaultPackage: low,
      packageRemaining: { mid: 2 },
    });
    expect(result.pointsDelta).toBe(20);
    expect(result.consumePackageId).toBe('mid');
  });

  it('falls back to default points when outside window', () => {
    const result = computeMatchPointsDelta({
      round: 3,
      isCorrect: true,
      pointsPerQuestion: 0,
      elapsedSec: 16,
      selectedPackage: mid,
      defaultPackage: low,
      packageRemaining: { mid: 2 },
    });
    expect(result.pointsDelta).toBe(10);
    expect(result.consumePackageId).toBeNull();
  });

  it('subtracts package points when wrong', () => {
    const result = computeMatchPointsDelta({
      round: 3,
      isCorrect: false,
      pointsPerQuestion: 0,
      elapsedSec: 5,
      selectedPackage: mid,
      defaultPackage: low,
      packageRemaining: { mid: 2 },
    });
    expect(result.pointsDelta).toBe(-20);
    expect(result.consumePackageId).toBeNull();
  });

  it('does not consume default package quota', () => {
    const result = computeMatchPointsDelta({
      round: 3,
      isCorrect: true,
      pointsPerQuestion: 0,
      elapsedSec: 5,
      selectedPackage: low,
      defaultPackage: low,
      packageRemaining: { low: 99 },
    });
    expect(result.pointsDelta).toBe(10);
    expect(result.consumePackageId).toBeNull();
  });
});

describe('computeMatchRunningTotal', () => {
  const scores = { 1: 40, 2: 60, 3: 0 };

  it('sums finished round with prior scores', () => {
    expect(computeMatchRunningTotal(scores, 1, 40)).toBe(100);
    expect(computeMatchRunningTotal(scores, 2, 25)).toBe(65);
    expect(computeMatchRunningTotal(scores, 3, 30)).toBe(130);
  });

  it('allows negative L3 in total', () => {
    expect(computeMatchRunningTotal(scores, 3, -10)).toBe(90);
  });
});

describe('applyMatchScoreDelta', () => {
  it('consumes premium package quota on in-window correct', () => {
    const play = basePlay({ remaining: 20 }); // elapsed 10 <= mid.timerSec 15
    const graded = applyMatchScoreDelta(baseSession(), play, true, packages, 'low');
    expect(graded.pointsDelta).toBe(20);
    expect(graded.session.round3PackageRemaining.mid).toBe(1);
    expect(graded.session.usedQuestionIds).toEqual(['q1']);
    expect(graded.play.phase).toBe('revealed');
    expect(graded.play.roundScore).toBe(20);
  });

  it('allows negative round score on wrong in L3', () => {
    const play = basePlay({ roundScore: 10, remaining: 25 });
    const graded = applyMatchScoreDelta(baseSession(), play, false, packages, 'low');
    expect(graded.pointsDelta).toBe(-20);
    expect(graded.play.roundScore).toBe(-10);
  });
});

describe('beginAnswering', () => {
  it('starts a fresh question timer after package pick', () => {
    const picking = basePlay({
      phase: 'picking-package',
      timerSec: 0,
      deadlineAt: 0,
      remaining: 0,
      selectedPackageId: null,
    });
    const now = 1_700_000_000_000;
    const answering = beginAnswering({ ...picking, selectedPackageId: 'high' }, 30, now);
    expect(answering.phase).toBe('answering');
    expect(answering.timerSec).toBe(30);
    expect(answering.remaining).toBe(30);
    expect(answering.deadlineAt).toBe(now + 30_000);
    expect(answering.selectedPackageId).toBe('high');
  });
});
