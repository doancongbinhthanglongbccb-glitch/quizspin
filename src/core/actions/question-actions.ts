import { normalizeQuestion, resetUsedFlags } from '../../data';
import type { Category } from '../../types';
import { appContext } from '../state';
import { showToast } from './shared';
import { currentCategory, ensureQuestionDraft } from './category-actions';

export function saveQuestionDraft(): void {
  const category = currentCategory();
  const runtime = appContext.getRuntimeState();

  if (!category) {
    return;
  }

  const questionText = runtime.questionDraft.question.trim();
  const answerText = runtime.questionDraft.answer.trim();

  if (!questionText || !answerText) {
    showToast('Cần nhập câu hỏi và đáp án');
    return;
  }

  const options = runtime.questionDraft.options.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  const question = normalizeQuestion({
    id: runtime.editingQuestionId ?? undefined,
    question: questionText,
    options,
    answer: answerText,
  });

  appContext.setAppState((current) => ({
    ...current,
    categories: current.categories.map((item) => {
      if (item.id !== category.id) {
        return item;
      }

      const existingIndex = item.questions.findIndex((entry) => entry.id === question.id);
      const nextQuestions = existingIndex >= 0 ? item.questions.map((entry) => (entry.id === question.id ? question : entry)) : [...item.questions, question];
      return { ...item, questions: nextQuestions };
    }),
  }));

  appContext.setRuntimeState({ editingQuestionId: null });
  ensureQuestionDraft(category);
  showToast('Đã lưu câu hỏi');
  // Append bank log
  try {
    const rt = appContext.getRuntimeState();
    const next = (rt.bankLogs ?? []).concat([{ ts: Date.now(), message: `Đã lưu câu: ${question.question}` }]);
    appContext.setRuntimeState({ bankLogs: next });
  } catch (e) {
    // ignore
  }
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
  // Append bank log for deletion
  try {
    const rt = appContext.getRuntimeState();
    const next = (rt.bankLogs ?? []).concat([{ ts: Date.now(), message: `Đã xóa câu (id=${questionId})` }]);
    appContext.setRuntimeState({ bankLogs: next });
  } catch (e) {}
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

export function saveQuestionEdit(id: string, question: string, options: string, answer: string): void {
  const category = currentCategory();
  if (!category) {
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
                    question,
                    options: options.split(/\r?\n/).filter(Boolean),
                    answer,
                  })
                : q,
            ),
          }
        : item,
    ),
  }));

  appContext.setRuntimeState({ editingQuestionId: null });
  ensureQuestionDraft(currentCategory());
  // Append bank log for edit
  try {
    const rt = appContext.getRuntimeState();
    const next = (rt.bankLogs ?? []).concat([{ ts: Date.now(), message: `Đã sửa câu (id=${id})` }]);
    appContext.setRuntimeState({ bankLogs: next });
  } catch (e) {}
}
