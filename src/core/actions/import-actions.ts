import { parseQuestionsFromSheet } from '../../data';
import { appContext } from '../state';
import { currentCategory } from './category-actions';
import { showToast } from './shared';

export function parseExcelImport(file: File): void {
  const categoryAtPick = currentCategory();
  if (!categoryAtPick) {
    return;
  }

  const targetCategoryId = categoryAtPick.id;
  const reader = new FileReader();

  reader.onerror = () => showToast('Không thể đọc file Excel');
  reader.onload = () => {
    const category = appContext.getAppState().categories.find((item) => item.id === targetCategoryId);
    if (!category) {
      showToast('Lĩnh vực đã bị xóa');
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

      appContext.setAppStateWithoutRender((current) => ({
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

export { requestClearAllData as clearEverything } from './confirm-actions';
