import type { MatchScorePackage, MatchSettings } from '../types';
import { DEFAULTS } from '../config';

/** ID ổn định — không random mỗi lần normalize */
const DEFAULT_MATCH_PACKAGE_IDS = {
  low: 'match-pkg-10',
  mid: 'match-pkg-20',
  high: 'match-pkg-30',
} as const;

const DEFAULT_MATCH_PACKAGES: MatchScorePackage[] = [
  { id: DEFAULT_MATCH_PACKAGE_IDS.low, points: 10, timerSec: 20 },
  { id: DEFAULT_MATCH_PACKAGE_IDS.mid, points: 20, timerSec: 15 },
  { id: DEFAULT_MATCH_PACKAGE_IDS.high, points: 30, timerSec: 10 },
];

function clampMatchCount(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(50, Math.max(1, Math.round(n)));
}

function clampMatchTimerSec(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(DEFAULTS.timerMaxSec, Math.max(DEFAULTS.timerMinSec, Math.round(n)));
}

function migrateMatchPackages(raw: unknown): MatchScorePackage[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_MATCH_PACKAGES.map((item) => ({ ...item }));
  }

  const packages: MatchScorePackage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const candidate = item as Partial<MatchScorePackage>;
    const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
    if (!id) {
      continue;
    }
    packages.push({
      id,
      points: Math.min(100, Math.max(1, Math.round(Number(candidate.points) || 10))),
      timerSec: clampMatchTimerSec(candidate.timerSec, 20),
    });
  }

  return packages.length > 0 ? packages : DEFAULT_MATCH_PACKAGES.map((item) => ({ ...item }));
}

/** Defaults + migrate mềm từ Settings cũ / backup thiếu `match`. */
export function normalizeMatchSettings(
  raw: unknown,
  fallbackTimerSec: number,
): MatchSettings {
  const timerFallback = clampMatchTimerSec(fallbackTimerSec, 30);
  const source = raw && typeof raw === 'object' ? (raw as Partial<MatchSettings>) : {};

  const packages = migrateMatchPackages(source.round3Packages);
  const defaultId =
    typeof source.round3DefaultPackageId === 'string' &&
    packages.some((item) => item.id === source.round3DefaultPackageId)
      ? source.round3DefaultPackageId
      : packages[0]!.id;

  return {
    round1QuestionCount: clampMatchCount(source.round1QuestionCount, 5),
    round1TimerSec: clampMatchTimerSec(source.round1TimerSec, timerFallback),
    round2QuestionsPerPack: clampMatchCount(source.round2QuestionsPerPack, 5),
    round2TimerSec: clampMatchTimerSec(source.round2TimerSec, timerFallback),
    round3QuestionCount: clampMatchCount(source.round3QuestionCount, 5),
    round3TimerSec: clampMatchTimerSec(source.round3TimerSec, 30),
    round3Packages: packages,
    round3DefaultPackageId: defaultId,
    round3PackagePickSec: clampMatchTimerSec(source.round3PackagePickSec, 10),
  };
}

export function defaultMatchSettings(fallbackTimerSec = 30): MatchSettings {
  return normalizeMatchSettings(undefined, fallbackTimerSec);
}

/** Tên 3 màn trên UI */
export const MATCH_ROUND_NAMES = {
  1: 'Khởi động',
  2: 'Tổng hợp',
  3: 'Về đích',
} as const;

/** Trần điểm cả ván */
export const MATCH_SCORE_CAP = 400;
const MATCH_ROUND_FIXED_MAX: Record<1 | 2, number> = { 1: 100, 2: 100 };

function matchRound3Budget(): number {
  return MATCH_SCORE_CAP - MATCH_ROUND_FIXED_MAX[1] - MATCH_ROUND_FIXED_MAX[2];
}

/**
 * Số lần tối đa mỗi gói không-mặc-định trong một ván Về đích.
 * - Gói mặc định: không có trong map (không giới hạn).
 * - Gói điểm cao nhất: tối đa 1 lần (nếu còn ngân sách).
 * - Gói còn lại: chia phần ngân sách thừa (sau baseline mặc định × số câu) để max ≤ trần 400.
 */
export function buildRound3PackageQuotas(match: MatchSettings): Record<string, number> {
  const defaultId = match.round3DefaultPackageId;
  const defaultPkg =
    match.round3Packages.find((item) => item.id === defaultId) ?? match.round3Packages[0];
  const defaultPoints = defaultPkg?.points ?? 10;
  const questionCount = match.round3QuestionCount;
  const budget = matchRound3Budget();

  const premium = match.round3Packages
    .filter((item) => item.id !== defaultId)
    .sort((a, b) => b.points - a.points || a.id.localeCompare(b.id));

  const quotas: Record<string, number> = {};
  for (const pkg of premium) {
    quotas[pkg.id] = 0;
  }

  let surplus = budget - defaultPoints * questionCount;
  if (surplus <= 0 || premium.length === 0) {
    return quotas;
  }

  let usesAssigned = 0;
  const high = premium[0]!;
  const highExtra = Math.max(0, high.points - defaultPoints);
  if (usesAssigned < questionCount && (highExtra === 0 || highExtra <= surplus)) {
    quotas[high.id] = 1;
    surplus -= highExtra;
    usesAssigned += 1;
  }

  const rest = premium.slice(1);
  for (let index = 0; index < rest.length; index += 1) {
    const pkg = rest[index]!;
    const extra = Math.max(0, pkg.points - defaultPoints);
    const slotsLeft = questionCount - usesAssigned;
    if (slotsLeft <= 0) {
      break;
    }
    if (extra === 0) {
      continue;
    }

    let maxUses = Math.min(Math.floor(surplus / extra), slotsLeft);
    if (index < rest.length - 1) {
      let reserved = 0;
      for (let later = index + 1; later < rest.length; later += 1) {
        const laterPkg = rest[later]!;
        const laterExtra = Math.max(0, laterPkg.points - defaultPoints);
        if (laterExtra > 0) {
          reserved += laterExtra;
        }
      }
      maxUses = Math.min(maxUses, Math.max(0, Math.floor((surplus - reserved) / extra)));
    }

    quotas[pkg.id] = maxUses;
    surplus -= maxUses * extra;
    usesAssigned += maxUses;
  }

  return quotas;
}

/** Điểm tối đa lý thuyết cả ván (có tính hạn mức gói Về đích). */
export function matchTheoreticalMaxScore(match: MatchSettings): number {
  const quotas = buildRound3PackageQuotas(match);
  const defaultPkg =
    match.round3Packages.find((item) => item.id === match.round3DefaultPackageId) ??
    match.round3Packages[0];
  const defaultPoints = defaultPkg?.points ?? 0;
  const questionCount = match.round3QuestionCount;

  let round3 = 0;
  let premiumUses = 0;
  for (const pkg of match.round3Packages) {
    if (pkg.id === match.round3DefaultPackageId) {
      continue;
    }
    const uses = quotas[pkg.id] ?? 0;
    round3 += pkg.points * uses;
    premiumUses += uses;
  }
  round3 += defaultPoints * Math.max(0, questionCount - premiumUses);

  return MATCH_ROUND_FIXED_MAX[1] + MATCH_ROUND_FIXED_MAX[2] + round3;
}
