import { appContext } from '../state';
import type { Category, CategoryExam, PracticeSetupDraft } from '../../types';
import {
  createDefaultPracticeSetupDraft,
  draftToPracticeConfig,
  generateCategoryExams,
  getSingleCategoryExam,
  shouldShowExamPicker,
} from '../exam-generator';
import { startCategoryExamSession, startPracticeExamSession } from './quiz-actions';
import { showToast } from './shared';

/** Mở luồng thi theo lĩnh vực — tự chọn đề hoặc hiện danh sách đề. */
export function openCategoryExamFlow(category: Category): void {
  if (category.questions.length === 0) {
    showToast(`Lĩnh vực ${category.name} đang trống`);
    return;
  }

  if (!shouldShowExamPicker(category)) {
    const exam = getSingleCategoryExam(category);
    if (exam) {
      startCategoryExamSession(category, exam);
    }
    return;
  }

  const exams = generateCategoryExams(category);
  appContext.setRuntimeState({
    examPicker: {
      kind: 'category',
      categoryId: category.id,
      categoryName: category.name,
      categoryColor: category.color,
      exams,
    },
  });
}

/** User chọn một đề trong danh sách lĩnh vực. */
export function selectCategoryExam(examId: string): void {
  const runtime = appContext.getRuntimeState();
  const picker = runtime.examPicker;
  if (!picker || picker.kind !== 'category') {
    return;
  }

  const exam = picker.exams.find((item) => item.id === examId);
  const category = appContext.getAppState().categories.find((item) => item.id === picker.categoryId);
  if (!exam || !category) {
    return;
  }

  appContext.setRuntimeState({ examPicker: null });
  startCategoryExamSession(category, exam);
}

/** Mở form cấu hình thi thử. */
export function openPracticeSetupFlow(): void {
  const totalQuestions = appContext.getAppState().categories.reduce((sum, c) => sum + c.questions.length, 0);
  if (totalQuestions === 0) {
    showToast('Chưa có câu hỏi để thi thử');
    return;
  }

  appContext.setRuntimeState({
    examPicker: { kind: 'practice' },
    practiceSetupDraft: runtimeHasDraft(appContext.getRuntimeState().practiceSetupDraft)
      ? appContext.getRuntimeState().practiceSetupDraft
      : createDefaultPracticeSetupDraft(),
  });
}

function runtimeHasDraft(draft: PracticeSetupDraft | null | undefined): draft is PracticeSetupDraft {
  return Boolean(draft);
}

export function closeExamPicker(): void {
  appContext.setRuntimeState({ examPicker: null });
}

/** Cập nhật bản nháp form thi thử (không re-render toàn app khi gõ custom). */
export function updatePracticeSetupDraft(update: Partial<PracticeSetupDraft>): void {
  const current = appContext.getRuntimeState().practiceSetupDraft ?? createDefaultPracticeSetupDraft();
  appContext.setRuntimeState({
    practiceSetupDraft: { ...current, ...update },
  });
}

export function patchPracticeSetupDraft(update: Partial<PracticeSetupDraft>): void {
  const current = appContext.getRuntimeState().practiceSetupDraft ?? createDefaultPracticeSetupDraft();
  appContext.patchRuntimeState({
    practiceSetupDraft: { ...current, ...update },
  });
}

/** Bắt đầu thi thử theo cấu hình đã chọn. */
export function startPracticeFromSetup(): void {
  const draft = appContext.getRuntimeState().practiceSetupDraft ?? createDefaultPracticeSetupDraft();
  const config = draftToPracticeConfig(draft);
  appContext.setRuntimeState({ examPicker: null });
  startPracticeExamSession(config);
}
