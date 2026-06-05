import type { Category } from '../../types';
import { makeCategory } from '../../data';
import { appContext } from '../state';

export function currentCategory(): Category | null {
  const appState = appContext.getAppState();
  const runtime = appContext.getRuntimeState();

  if (!runtime.selectedCategoryId) {
    return appState.categories[0] ?? null;
  }

  return appState.categories.find((category) => category.id === runtime.selectedCategoryId) ?? appState.categories[0] ?? null;
}

export function ensureQuestionDraft(category?: Category | null): void {
  const runtime = appContext.getRuntimeState();

  if (!category) {
    appContext.setRuntimeState({ questionDraft: { question: '', options: '', answer: '' } });
    return;
  }

  if (runtime.editingQuestionId) {
    const item = category.questions.find((question) => question.id === runtime.editingQuestionId);
    if (item) {
      appContext.setRuntimeState({
        questionDraft: {
          question: item.question,
          options: item.options.join('\n'),
          answer: item.answer,
        },
      });
      return;
    }
  }

  appContext.setRuntimeState({ questionDraft: { question: '', options: '', answer: '' } });
}

export function selectCategory(categoryId: string): void {
  const appState = appContext.getAppState();
  const category = appState.categories.find((item) => item.id === categoryId);

  appContext.setRuntimeState({ selectedCategoryId: categoryId, editingQuestionId: null });
  ensureQuestionDraft(category);
}

export function addCategory(): void {
  const name = window.prompt('Tên lĩnh vực mới?');
  if (!name?.trim()) {
    return;
  }

  const nextCategory = makeCategory(name.trim());
  appContext.setAppState((current) => ({ ...current, categories: [...current.categories, nextCategory] }));
  appContext.setRuntimeState({ selectedCategoryId: nextCategory.id });
  ensureQuestionDraft(nextCategory);
  try {
    const rt = appContext.getRuntimeState();
    const next = (rt.bankLogs ?? []).concat([{ ts: Date.now(), message: `Đã thêm lĩnh vực: ${nextCategory.name}` }]);
    appContext.setRuntimeState({ bankLogs: next });
  } catch (e) {}
}

export function renameCategory(category: Category): void {
  const name = window.prompt('Đổi tên lĩnh vực', category.name);
  if (!name?.trim()) {
    return;
  }

  appContext.setAppState((current) => ({
    ...current,
    categories: current.categories.map((item) => (item.id === category.id ? { ...item, name: name.trim() } : item)),
  }));
  try {
    const rt = appContext.getRuntimeState();
    const next = (rt.bankLogs ?? []).concat([{ ts: Date.now(), message: `Đổi tên lĩnh vực: ${category.name} → ${name.trim()}` }]);
    appContext.setRuntimeState({ bankLogs: next });
  } catch (e) {}
}

export function deleteCategory(category: Category): void {
  if (!window.confirm(`Xóa toàn bộ ${category.questions.length} câu trong ${category.name}?`)) {
    return;
  }

  appContext.setAppState((current) => {
    const next = current.categories.filter((item) => item.id !== category.id);
    return { ...current, categories: next.length ? next : [makeCategory('Lĩnh vực mới')] };
  });

  const runtime = appContext.getRuntimeState();
  if (runtime.selectedCategoryId === category.id) {
    appContext.setRuntimeState({ selectedCategoryId: appContext.getAppState().categories[0]?.id ?? null });
  }

  ensureQuestionDraft(currentCategory());
  try {
    const rt = appContext.getRuntimeState();
    const next = (rt.bankLogs ?? []).concat([{ ts: Date.now(), message: `Xóa lĩnh vực: ${category.name}` }]);
    appContext.setRuntimeState({ bankLogs: next });
  } catch (e) {}
}
