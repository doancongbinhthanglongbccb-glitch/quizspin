import { buildWheelModel, buildWheelModelFromSegments } from '../wheel';
import { appContext } from '../state';
import { spinSession } from '../spin-session';
import { syncSpinUi } from '../../utils/sync-spin-ui';
import { showToast } from './shared';
import { createEmptyMatchSession, getMatchExcludeIds, startMatchActivePlay } from './match-play-actions';
import { buildRound2ExamPacks, getMatchWheelExamPacks, isMatchExamPackUsed, pickMatchQuestionsFromCategory } from '../match-questions';
import { MATCH_ROUND_NAMES } from '../../config/match';
import { MAX_WHEEL_SEGMENTS } from '../../config';
import type { Category, MatchExamPack, MatchRoundId, WheelSegment } from '../../types';

const ROUND2_PACK_COLORS = [
  '#b42318',
  '#c45c26',
  '#d4a017',
  '#2d6a4f',
  '#1a4d3e',
  '#8f1c14',
  '#a67c00',
  '#3d5a40',
];

function buildExamPackWheelSegments(packs: MatchExamPack[]): WheelSegment[] {
  return packs.map((pack, index) => ({
    id: pack.id,
    label: pack.title,
    kind: 'category' as const,
    color: ROUND2_PACK_COLORS[index % ROUND2_PACK_COLORS.length]!,
  }));
}

export function buildRound2WheelModel(packs: MatchExamPack[]) {
  return buildWheelModelFromSegments(buildExamPackWheelSegments(packs));
}

/** Pool đầy đủ (preview hoặc session) — chưa cắt cửa sổ bánh xe. */
export function getSpinRound2PoolPacks(): MatchExamPack[] {
  const session = appContext.getRuntimeState().matchSession;
  if (session?.round2Packs.length) {
    return session.round2Packs;
  }

  const match = appContext.getAppState().settings.match;
  if (!match) {
    return [];
  }

  return buildRound2ExamPacks(appContext.getAppState().categories, {
    questionsPerPack: match.round2QuestionsPerPack,
    excludeIds: getMatchExcludeIds(session?.usedQuestionIds ?? []),
  }).packs;
}

/** Tối đa 8 bộ chưa hỏi hết — dùng để vẽ / quay bánh xe. */
export function getSpinRound2WheelPacks(): MatchExamPack[] {
  const session = appContext.getRuntimeState().matchSession;
  const pool = getSpinRound2PoolPacks();
  return getMatchWheelExamPacks(pool, session?.usedQuestionIds ?? [], MAX_WHEEL_SEGMENTS);
}

export function setSpinRoundView(round: MatchRoundId): void {
  const runtime = appContext.getRuntimeState();
  if (runtime.spinning || runtime.spinRoundView === round) {
    return;
  }
  appContext.setRuntimeState({ spinRoundView: round });
}

export function notifySpinRoundLocked(round: MatchRoundId): void {
  if (round === 2) {
    showToast(`Hoàn thành ${MATCH_ROUND_NAMES[1]} để mở ${MATCH_ROUND_NAMES[2]}`);
    return;
  }
  if (round === 3) {
    showToast(`Hoàn thành ${MATCH_ROUND_NAMES[1]} và ${MATCH_ROUND_NAMES[2]} để mở ${MATCH_ROUND_NAMES[3]}`);
  }
}

/**
 * Thiếu câu so với Settings:
 * - 0 câu khả dụng → chặn
 * - còn ít hơn requested → lấy hết + toast
 */
export function startRound1FromCategory(category: Category): void {
  const match = appContext.getAppState().settings.match;
  if (!match) {
    showToast('Thiếu cấu hình match trong Settings');
    return;
  }

  const session = createEmptyMatchSession(1);
  const picked = pickMatchQuestionsFromCategory(category, {
    count: match.round1QuestionCount,
    excludeIds: getMatchExcludeIds(),
  });

  if (picked.available === 0 || picked.questions.length === 0) {
    showToast(`Lĩnh vực ${category.name} không còn câu hỏi để chơi`);
    return;
  }

  if (picked.questions.length < picked.requested) {
    showToast(
      `Chỉ còn ${picked.questions.length}/${picked.requested} câu trong ${category.name} — chơi với số còn lại`,
    );
  }

  startMatchActivePlay({
    round: 1,
    questionIds: picked.questions.map((q) => q.id),
    label: category.name,
    accentColor: category.color,
    existingSession: session,
  });
}

function showSpinResultModal(params: {
  label: string;
  color: string;
  round: 1 | 2;
  categoryId?: string;
  packId?: string;
}): void {
  appContext.setRuntimeState({
    modal: {
      kind: 'spin-result',
      label: params.label,
      color: params.color,
      eyebrow: MATCH_ROUND_NAMES[params.round],
      round: params.round,
      categoryId: params.categoryId,
      packId: params.packId,
    },
  });
  syncSpinUi();
}

function resolveSegmentAction(segment: WheelSegment): void {
  if (segment.kind !== 'category' || !segment.categoryId) {
    return;
  }

  const category = appContext.getAppState().categories.find((item) => item.id === segment.categoryId);
  if (!category) {
    return;
  }

  const match = appContext.getAppState().settings.match;
  if (!match) {
    showToast('Thiếu cấu hình match trong Settings');
    return;
  }

  const preview = pickMatchQuestionsFromCategory(category, {
    count: match.round1QuestionCount,
    excludeIds: getMatchExcludeIds(),
  });
  if (preview.available === 0 || preview.questions.length === 0) {
    showToast(`Lĩnh vực ${category.name} không còn câu hỏi để chơi`);
    return;
  }

  showSpinResultModal({
    label: category.name,
    color: category.color,
    round: 1,
    categoryId: category.id,
  });
}

export function spin(): void {
  const runtime = appContext.getRuntimeState();
  const appState = appContext.getAppState();

  if (runtime.spinning || runtime.modal || runtime.matchSession) {
    return;
  }

  const model = buildWheelModel(appState);
  if (!model.segments.length) {
    showToast('Chưa có dữ liệu để quay');
    return;
  }

  const chosen = model.segments[Math.floor(Math.random() * model.segments.length)];

  spinSession.cancel();
  appContext.patchRuntimeState({ spinning: true, rotation: runtime.rotation });
  syncSpinUi();

  spinSession.start(model, chosen, runtime.rotation, {
    onComplete: ({ segment }) => resolveSegmentAction(segment),
  });
}

/** Vòng quay bộ đề màn Tổng hợp. */
export function spinMatchRound2(): void {
  const runtime = appContext.getRuntimeState();
  const session = runtime.matchSession;

  if (
    runtime.spinning ||
    !session ||
    session.currentRound !== 2 ||
    session.activePlay ||
    session.roundSummary ||
    session.round2Packs.length === 0
  ) {
    return;
  }

  if (session.round2Packs.some((pack) => isMatchExamPackUsed(pack, session.usedQuestionIds))) {
    showToast(`${MATCH_ROUND_NAMES[2]} chỉ chơi một lần`);
    return;
  }

  const model = buildRound2WheelModel(getMatchWheelExamPacks(session.round2Packs, session.usedQuestionIds, MAX_WHEEL_SEGMENTS));
  if (!model.segments.length) {
    showToast('Không còn bộ đề để quay');
    return;
  }

  const chosen = model.segments[Math.floor(Math.random() * model.segments.length)]!;

  spinSession.cancel();
  appContext.patchRuntimeState({ spinning: true, rotation: runtime.rotation });
  syncSpinUi();

  spinSession.start(model, chosen, runtime.rotation, {
    onComplete: ({ segment }) => {
      const live = appContext.getRuntimeState().matchSession;
      if (!live || live.currentRound !== 2 || live.activePlay) {
        return;
      }
      const pack = live.round2Packs.find((item) => item.id === segment.id);
      if (!pack) {
        showToast('Không tìm thấy bộ đề đã quay');
        return;
      }
      showSpinResultModal({
        label: pack.title,
        color: segment.color,
        round: 2,
        packId: pack.id,
      });
    },
  });
}
