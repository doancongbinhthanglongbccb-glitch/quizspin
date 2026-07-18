import { parseQuestionsFromSheet } from '../../data';
import type { ImportDiagnostic } from '../../types';
import { appContext } from '../state';
import { currentCategory } from './category-actions';
import { showToast } from './shared';

function topSkipReasons(diagnostics: ImportDiagnostic[], limit = 3): Array<{ reason: string; count: number }> {
  const counts = new Map<string, number>();
  for (const item of diagnostics) {
    if (item.reason === 'Dòng trống') {
      continue;
    }
    counts.set(item.reason, (counts.get(item.reason) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function buildImportToast(imported: number, skipped: number, categoryName: string, diagnostics: ImportDiagnostic[]): string {
  const reasons = topSkipReasons(diagnostics);
  const reasonHint = reasons.length
    ? reasons.map((item) => `${item.reason} (${item.count} dòng)`).join('; ')
    : '';

  if (imported === 0) {
    if (reasonHint) {
      return `Không nhập được câu nào. ${reasonHint}. Xem chi tiết bên dưới.`;
    }
    return 'File không có dữ liệu hợp lệ. Cần cột: Câu hỏi | Phương án | Đáp án đúng.';
  }

  if (skipped > 0 && reasonHint) {
    return `Đã thêm ${imported} câu vào ${categoryName}. Bỏ qua ${skipped} dòng — ${reasonHint}.`;
  }

  if (skipped > 0) {
    return `Đã thêm ${imported} câu vào ${categoryName}. Bỏ qua ${skipped} dòng trống.`;
  }

  return `Đã thêm ${imported} câu vào ${categoryName}`;
}

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
        showToast('File không có dữ liệu hợp lệ. Cần cột: Câu hỏi | Phương án | Đáp án đúng.');
        return;
      }

      const stamped = parsed.questions.map((question) => ({ ...question, categoryId: category.id }));

      if (stamped.length) {
        appContext.setAppStateWithoutRender((current) => ({
          ...current,
          categories: current.categories.map((item) =>
            item.id === category.id ? { ...item, questions: [...item.questions, ...stamped] } : item,
          ),
        }));
      }

      appContext.setRuntimeState({
        importReport: {
          imported: parsed.questions.length,
          skipped: parsed.stats.skipped,
          stats: parsed.stats,
          diagnostics: parsed.diagnostics,
        },
      });

      showToast(buildImportToast(parsed.questions.length, parsed.stats.skipped, category.name, parsed.diagnostics));
    } catch {
      appContext.setRuntimeState({ importReport: null });
      showToast('Định dạng file Excel không hợp lệ (.xlsx / .xls)');
    }
  };

  reader.readAsArrayBuffer(file);
}

export { requestClearAllData as clearEverything } from './confirm-actions';
