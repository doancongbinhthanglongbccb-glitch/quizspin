import { mcqAnswerMatchesOptions, normalizeQuestion, parseMcqOptions } from '../../data';
import type { QuestionDraft, QuestionFilter, QuestionType } from '../../types';
import { appContext } from '../state';
import { removeQuestionFromPools } from '../pool-manager';
import { showToast } from './shared';
import { currentCategory, ensureQuestionDraft } from './category-actions';
import { closeQuizSession } from './quiz-actions';

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
  appContext.patchRuntimeState({
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

  if (draft.type !== 'mcq') {
    showToast('Chỉ hỗ trợ câu trắc nghiệm');
    return;
  }

  const options = parseMcqOptions(draft.options);
  if (!options.length) {
    showToast('Câu trắc nghiệm cần ít nhất 1 phương án');
    return;
  }
  if (!mcqAnswerMatchesOptions(answerText, options)) {
    showToast('Đáp án phải khớp một phương án (A/B/C/D đúng chữ trên dòng phương án, hoặc đúng nội dung)');
    return;
  }

  const question = normalizeQuestion({
    id: runtime.editingQuestionId ?? undefined,
    categoryId: category.id,
    type: 'mcq',
    question: questionText,
    options: draft.options,
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

  appContext.setRuntimeState({ editingQuestionId: null, bankFormOpen: false });
  ensureQuestionDraft(category);
  showToast('Đã lưu câu trắc nghiệm');
}

export function deleteQuestion(categoryId: string, questionId: string): void {
  const runtime = appContext.getRuntimeState();
  const session = runtime.quizSession;
  const shouldCloseQuiz =
    session && session.phase === 'active' && session.questionIds.includes(questionId);

  if (shouldCloseQuiz) {
    closeQuizSession();
  }

  const editingCleared = runtime.editingQuestionId === questionId;

  appContext.setAppState((current) => ({
    ...current,
    categories: current.categories.map((category) =>
      category.id === categoryId ? { ...category, questions: category.questions.filter((question) => question.id !== questionId) } : category,
    ),
  }));

  appContext.setQuestionPools((current) => removeQuestionFromPools(current, questionId));

  appContext.setRuntimeState({
    ...(editingCleared ? { editingQuestionId: null, bankFormOpen: false } : {}),
  });

  if (editingCleared) {
    ensureQuestionDraft(currentCategory());
  }
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

  if (type !== 'mcq') {
    showToast('Chỉ hỗ trợ câu trắc nghiệm');
    return;
  }

  const parsedOptions = parseMcqOptions(options);
  if (!parsedOptions.length) {
    showToast('Câu trắc nghiệm cần ít nhất 1 phương án');
    return;
  }
  if (!mcqAnswerMatchesOptions(answerText, parsedOptions)) {
    showToast('Đáp án phải khớp một phương án (A/B/C/D đúng chữ trên dòng phương án, hoặc đúng nội dung)');
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
                    type: 'mcq',
                    question: questionText,
                    options,
                    answer: answerText,
                    points: q.points,
                  })
                : q,
            ),
          }
        : item,
    ),
  }));

  appContext.setRuntimeState({ editingQuestionId: null, bankFormOpen: false });
  ensureQuestionDraft(currentCategory());
  showToast('Đã cập nhật câu hỏi');
}
