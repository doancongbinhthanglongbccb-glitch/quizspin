import { QUIZ_CONFIG } from '../config/quiz';
import { shuffleArray } from '../data';
import type { Category, CategoryExam, PracticeConfig, PracticeSetupDraft } from '../types';

/** Hash đơn giản — seed cố định theo category để shuffle đề ổn định giữa các lần mở app. */
function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Fisher–Yates với seed — cùng input → cùng thứ tự câu. */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let state = seed || 1;

  for (let i = arr.length - 1; i > 0; i -= 1) {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    const j = state % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

/** Chữ ký bộ câu — đổi khi thêm/xóa/sửa câu trong lĩnh vực. */
export function categoryQuestionSignature(category: Category): string {
  return category.questions
    .map((q) => q.id)
    .sort()
    .join('|');
}

/**
 * Chia lĩnh vực thành các đề cố định.
 * Thứ tự câu shuffle một lần theo seed category — không đổi mỗi lần user chọn đề.
 */
export function generateCategoryExams(
  category: Category,
  questionsPerExam = QUIZ_CONFIG.questionsPerExam,
): CategoryExam[] {
  if (category.questions.length === 0) {
    return [];
  }

  const seed = hashString(`${category.id}:${categoryQuestionSignature(category)}`);
  const shuffled = seededShuffle(category.questions, seed);
  const exams: CategoryExam[] = [];

  for (let offset = 0; offset < shuffled.length; offset += questionsPerExam) {
    const chunk = shuffled.slice(offset, offset + questionsPerExam);
    const index = Math.floor(offset / questionsPerExam) + 1;
    exams.push({
      id: `${category.id}-exam-${index}`,
      categoryId: category.id,
      index,
      title: `Đề ${index}`,
      questionIds: chunk.map((q) => q.id),
      questionCount: chunk.length,
    });
  }

  return exams;
}

/** Cần hiện danh sách chọn đề (≥ minQuestionsForSplit câu). */
export function shouldShowExamPicker(category: Category): boolean {
  return category.questions.length >= QUIZ_CONFIG.minQuestionsForSplit;
}

/** Lấy đề duy nhất khi lĩnh vực ít hơn ngưỡng chia đề. */
export function getSingleCategoryExam(category: Category): CategoryExam | null {
  const exams = generateCategoryExams(category);
  return exams[0] ?? null;
}

/** Random câu thi thử từ mọi lĩnh vực — mỗi lần thi khác nhau. */
export function pickPracticeExamQuestions(categories: Category[], config: PracticeConfig) {
  const all = categories.flatMap((c) => c.questions);
  if (all.length === 0) {
    return [];
  }

  const count = Math.min(config.questionCount, all.length);
  return shuffleArray(all).slice(0, count);
}

/** Chuyển preset phút → giây; `null` = không giới hạn. */
export function practiceTimerPresetToSec(preset: PracticeSetupDraft['timerPreset'], customMin: string): number | null {
  if (preset === 'unlimited') {
    return null;
  }
  if (preset === 'custom') {
    const parsed = Number.parseInt(customMin, 10);
    if (!Number.isFinite(parsed) || parsed < QUIZ_CONFIG.practiceTimerMinMin) {
      return QUIZ_CONFIG.practiceTimerPresetsMin[0] * 60;
    }
    return Math.min(parsed, QUIZ_CONFIG.practiceTimerMaxMin) * 60;
  }
  return Number.parseInt(preset, 10) * 60;
}

export function resolvePracticeQuestionCount(draft: PracticeSetupDraft): number {
  if (draft.questionPreset === 'custom') {
    const parsed = Number.parseInt(draft.customQuestionCount, 10);
    if (!Number.isFinite(parsed)) {
      return QUIZ_CONFIG.practiceQuestionPresets[1];
    }
    return Math.min(
      QUIZ_CONFIG.practiceQuestionMax,
      Math.max(QUIZ_CONFIG.practiceQuestionMin, parsed),
    );
  }
  return draft.questionPreset;
}

export function draftToPracticeConfig(draft: PracticeSetupDraft): PracticeConfig {
  return {
    questionCount: resolvePracticeQuestionCount(draft),
    timerSec: practiceTimerPresetToSec(draft.timerPreset, draft.customTimerMin),
  };
}

export function createDefaultPracticeSetupDraft(): PracticeSetupDraft {
  return {
    questionPreset: 20,
    customQuestionCount: '25',
    timerPreset: '30',
    customTimerMin: '45',
  };
}
