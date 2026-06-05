import { createSampleState, parseQuestionsFromSheet } from '../../data';
import { appContext } from '../state';
import { clearState, saveState } from '../../storage';
import { currentCategory, ensureQuestionDraft } from './category-actions';
import { showToast } from './shared';

export function parseExcelImport(file: File): void {
  const reader = new FileReader();

  reader.onerror = () => showToast('Không thể đọc file Excel');
  reader.onload = () => {
    const category = currentCategory();
    if (!category) {
      return;
    }

    try {
      const buffer = reader.result;
      if (!(buffer instanceof ArrayBuffer)) {
        throw new Error('Invalid file');
      }

      const parsed = parseQuestionsFromSheet(buffer);
      if (!parsed.questions.length && !parsed.diagnostics.length) {
        showToast('File không có dữ liệu hợp lệ');
        return;
      }

      const stamped = parsed.questions.map((question) => ({ ...question, categoryId: category.id }));

      appContext.setAppState((current) => ({
        ...current,
        categories: current.categories.map((item) =>
          item.id === category.id ? { ...item, questions: [...item.questions, ...stamped] } : item,
        ),
      }));

      appContext.setRuntimeState({
        importReport: {
          imported: parsed.questions.length,
          skipped: parsed.stats.skipped,
          stats: parsed.stats,
          diagnostics: parsed.diagnostics,
        },
      });

      showToast(
        `Đã thêm ${parsed.questions.length} câu (${parsed.stats.mcq} MCQ, ${parsed.stats.essay} Essay) vào ${category.name}`,
      );
    } catch {
      appContext.setRuntimeState({ importReport: null });
      showToast('Định dạng file Excel không hợp lệ');
    }
  };

  reader.readAsArrayBuffer(file);
}

export async function clearEverything(): Promise<void> {
  if (!window.confirm('Bạn chắc chắn muốn xóa toàn bộ dữ liệu?')) {
    return;
  }
  if (!window.confirm('Hành động này không thể hoàn tác. Xác nhận xóa?')) {
    return;
  }

  const sampleState = createSampleState();
  appContext.setAppState(sampleState);

  appContext.setRuntimeState({
    selectedCategoryId: sampleState.categories[0]?.id ?? null,
    editingQuestionId: null,
    usedQuestionIds: new Set(),
    usedGifts: new Set(),
    usedPunishments: new Set(),
    importReport: null,
    spinHistory: [],
  });

  ensureQuestionDraft(currentCategory());

  await clearState().catch(() => undefined);
  await saveState(appContext.getAppState()).catch(() => undefined);

  showToast('Đã khôi phục dữ liệu mẫu');
}
