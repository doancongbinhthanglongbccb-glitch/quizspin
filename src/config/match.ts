import type { MatchScorePackage, MatchSettings } from '../types';
import { DEFAULTS } from '../config';

/** ID ổn định — không random mỗi lần normalize */
export const DEFAULT_MATCH_PACKAGE_IDS = {
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
    round3Packages: packages,
    round3DefaultPackageId: defaultId,
  };
}

export function defaultMatchSettings(fallbackTimerSec = 30): MatchSettings {
  return normalizeMatchSettings(undefined, fallbackTimerSec);
}

/** Điểm tối đa lý thuyết cả ván — dùng cảnh báo Settings (Phase 6). */
export function matchTheoreticalMaxScore(match: MatchSettings): number {
  const round1 = 100;
  const round2 = 100;
  const maxPackage = Math.max(...match.round3Packages.map((item) => item.points), 0);
  const round3 = match.round3QuestionCount * maxPackage;
  return round1 + round2 + round3;
}

/** Giây chờ chọn gói L3 trước khi tự áp gói mặc định (chưa có field Settings). */
export const ROUND3_PACKAGE_PICK_SEC = 10;
