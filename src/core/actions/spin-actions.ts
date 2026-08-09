import { buildWheelModel } from '../wheel';
import { appContext } from '../state';
import { spinSession } from '../spin-session';
import { syncSpinUi } from '../../utils/sync-spin-ui';
import { showToast } from './shared';
import { createEmptyMatchSession, startMatchActivePlay } from './match-play-actions';
import { pickMatchQuestionsFromCategory } from '../match-questions';
import type { Category, WheelSegment } from '../../types';

/**
 * Thiếu câu so với Settings:
 * - 0 câu khả dụng → chặn, không vào lượt
 * - còn ít hơn requested → lấy hết + toast cảnh báo (pointsPerQuestion = 100/số thật)
 */
function startRound1FromCategory(category: Category): void {
  const match = appContext.getAppState().settings.match;
  if (!match) {
    showToast('Thiếu cấu hình match trong Settings');
    return;
  }

  const session = createEmptyMatchSession(1);
  const picked = pickMatchQuestionsFromCategory(category, {
    count: match.round1QuestionCount,
    excludeIds: session.usedQuestionIds,
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

function resolveSegmentAction(segment: WheelSegment): void {
  if (segment.kind === 'category' && segment.categoryId) {
    const category = appContext.getAppState().categories.find((item) => item.id === segment.categoryId);
    if (category) {
      startRound1FromCategory(category);
    }
    return;
  }
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
