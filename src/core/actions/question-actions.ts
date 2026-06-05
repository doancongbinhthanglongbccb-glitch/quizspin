import { normalizeQuestion, parseMcqOptions, resetUsedFlags } from '../../data';
import type { Category, QuestionDraft, QuestionFilter, QuestionType } from '../../types';
import { appContext } from '../state';
import { showToast } from './shared';
import { currentCategory, ensureQuestionDraft } from './category-actions';

export function setQuestionFilter(filter: QuestionFilter): void {
  appContext.setRuntimeState({ questionFilter: filter });
}

export function setQuestionDraftType(type: QuestionType): void {
  const runtime = appContext.getRuntimeState();
  appContext.setRuntimeState({
    questionDraft: {
      ...runtime.questionDraft,
      type,
      options: type === 'essay' ? '' : runtime.questionDraft.options,
    },
  });
}

export function updateQuestionDraft(patch: Partial<QuestionDraft>): void {
  const runtime = appContext.getRuntimeState();
  appContext.setRuntimeState({
    questionDraft: { ...runtime.questionDraft, ...patch },
  });
}

export function saveQuestionDraft(): void {
  const category = currentCategory();
  const runtime = appContext.getRuntimeState();

  if (!category) {
    return;
  }

  const draft = runtime.questionDraft;
  const questionText = draft.question.trim();
  const answerText = draft.answer.trim();

  if (!questionText || !answerText) {
    showToast('Cần nhập câu hỏi và đáp án');
    return;
  }

  if (draft.type === 'mcq' && !parseMcqOptions(draft.options).length) {
    showToast('Câu trắc nghiệm cần ít nhất 1 phương án');
    return;
  }

  const question = normalizeQuestion({
    id: runtime.editingQuestionId ?? undefined,
    categoryId: category.id,
    type: draft.type,
    question: questionText,
    options: draft.type === 'mcq' ? draft.options : undefined,
    answer: answerText,
  });

  appContext.setAppState((current) => ({
    ...current,
    categories: current.categories.map((item) => {
      if (item.id !== category.id) {
        return item;
      }

      const existingIndex = item.questions.findIndex((entry) => entry.id === question.id);
      const nextQuestions =
        existingIndex >= 0
          ? item.questions.map((entry) => (entry.id === question.id ? question : entry))
          : [...item.questions, question];
      return { ...item, questions: nextQuestions };
    }),
  }));

  appContext.setRuntimeState({ editingQuestionId: null });
  ensureQuestionDraft(category);
  showToast(`Đã lưu câu ${draft.type === 'mcq' ? 'trắc nghiệm' : 'tự luận'}`);
}

export function deleteQuestion(categoryId: string, questionId: string): void {
  appContext.setAppState((current) => ({
    ...current,
    categories: current.categories.map((category) =>
      category.id === categoryId ? { ...category, questions: category.questions.filter((question) => question.id !== questionId) } : category,
    ),
  }));

  const runtime = appContext.getRuntimeState();
  const nextUsedQuestionIds = new Set(runtime.usedQuestionIds);
  nextUsedQuestionIds.delete(questionId);
  appContext.setRuntimeState({ usedQuestionIds: nextUsedQuestionIds });

  if (runtime.editingQuestionId === questionId) {
    appContext.setRuntimeState({ editingQuestionId: null });
    ensureQuestionDraft(currentCategory());
  }
}

export function resetQuestionFlags(category: Category): void {
  const runtime = appContext.getRuntimeState();
  const nextUsedQuestionIds = new Set(runtime.usedQuestionIds);

  for (const question of category.questions) {
    nextUsedQuestionIds.delete(question.id);
  }

  appContext.setRuntimeState({ usedQuestionIds: nextUsedQuestionIds });
  appContext.setAppState((current) => ({
    ...current,
    categories: current.categories.map((item) => (item.id === category.id ? { ...item, questions: resetUsedFlags(item.questions) } : item)),
  }));
}

export function saveQuestionEdit(
  id: string,
  type: QuestionType,
  question: string,
  options: string,
  answer: string,
): void {
  const category = currentCategory();
  if (!category) {
    return;
  }

  const questionText = question.trim();
  const answerText = answer.trim();
  if (!questionText || !answerText) {
    showToast('Cần nhập câu hỏi và đáp án');
    return;
  }

  if (type === 'mcq' && !parseMcqOptions(options).length) {
    showToast('Câu trắc nghiệm cần ít nhất 1 phương án');
    return;
  }

  appContext.setAppState((current) => ({
    ...current,
    categories: current.categories.map((item) =>
      item.id === category.id
        ? {
            ...item,
            questions: item.questions.map((q) =>
              q.id === id
                ? normalizeQuestion({
                    id,
                    categoryId: category.id,
                    type,
                    question: questionText,
                    options: type === 'mcq' ? options : undefined,
                    answer: answerText,
                    points: q.points,
                  })
                : q,
            ),
          }
        : item,
    ),
  }));

  appContext.setRuntimeState({ editingQuestionId: null });
  ensureQuestionDraft(currentCategory());
  showToast('Đã cập nhật câu hỏi');
}
