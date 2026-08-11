import * as XLSX from 'xlsx';
import type {
  ImportResult,
  ImportStats,
  ImportedQuestionRow,
  Question,
  QuestionType,
} from '../types';
import { normalizeQuestion, parseMcqOptions, parseQuestionTypeInput } from './mcq';

function emptyImportStats(): ImportStats {
  return { total: 0, mcq: 0, essay: 0, skipped: 0, byCategory: {} };
}

function bumpCategoryStats(stats: ImportStats, categoryName: string | null, type: QuestionType): void {
  const key = categoryName?.trim() || '(mặc định)';
  if (!stats.byCategory[key]) {
    stats.byCategory[key] = { mcq: 0, essay: 0, total: 0 };
  }
  stats.byCategory[key].total += 1;
  if (type === 'mcq') {
    stats.byCategory[key].mcq += 1;
    stats.mcq += 1;
  } else {
    stats.byCategory[key].essay += 1;
    stats.essay += 1;
  }
  stats.total += 1;
}

function isHeaderRow(cells: string[]): boolean {
  const first = (cells[0] ?? '').toLowerCase();
  const joined = cells.join(' ').toLowerCase();
  return (
    /^(câu hỏi|question|lĩnh vực|linh vuc|category)/i.test(first) ||
    joined.includes('đáp án') ||
    joined.includes('dap an') ||
    joined.includes('phương án') ||
    joined.includes('phuong an') ||
    joined.includes('loại') ||
    joined.includes('loai')
  );
}

/** Bỏ cột trống thừa cuối hàng — Excel thường padding thêm cột rỗng. */
function trimTrailingEmptyCells(cells: string[]): string[] {
  let end = cells.length;
  while (end > 0 && !(cells[end - 1] ?? '').trim()) {
    end -= 1;
  }
  return cells.slice(0, end);
}

type SheetFormat = 'category-four-col' | 'legacy-typed' | 'legacy-hybrid' | 'legacy-two-col';

function detectSheetFormat(cells: string[]): SheetFormat {
  const col1IsType = Boolean(parseQuestionTypeInput(cells[1] ?? ''));
  const col1LooksLikeOptions =
    /\r?\n/.test(cells[1] ?? '') || /^[A-Da-d][.):]/.test((cells[1] ?? '').trim());

  // 3 cột: Câu hỏi | Phương án | Đáp án (kể cả khi Excel còn cột trống thừa đã trim)
  if (cells.length === 3 || (cells.length >= 3 && col1LooksLikeOptions && !col1IsType)) {
    return 'legacy-hybrid';
  }

  // Legacy: Lĩnh vực | Loại | Câu hỏi | Options/Đáp án [| Đáp án đúng]
  if (cells.length >= 5 || (cells.length >= 4 && col1IsType)) {
    return 'legacy-typed';
  }

  if (cells.length >= 4) {
    return 'category-four-col';
  }

  return 'legacy-two-col';
}

/** Format chuẩn: Lĩnh vực | Câu hỏi | Options | Đáp án đúng */
function parseCategoryFourColRow(cells: string[]): { question: Question; categoryName: string | null } | { error: string } {
  const categoryName = (cells[0] ?? '').trim() || null;
  const questionText = (cells[1] ?? '').trim();
  const optionsRaw = (cells[2] ?? '').trim();
  const answer = (cells[3] ?? '').trim();

  if (!questionText) {
    return { error: 'Thiếu nội dung câu hỏi' };
  }

  if (optionsRaw) {
    const options = parseMcqOptions(optionsRaw);
    if (!options.length) {
      return { error: 'Cột phương án không đọc được (mỗi lựa chọn một dòng, VD: A. ...)' };
    }
    if (!answer) {
      return { error: 'Thiếu đáp án đúng' };
    }
    return {
      categoryName,
      question: normalizeQuestion({ categoryId: '', type: 'mcq', question: questionText, options, answer }),
    };
  }

  if (!answer) {
    return { error: 'Thiếu phương án hoặc đáp án đúng' };
  }

  return {
    categoryName,
    question: normalizeQuestion({ categoryId: '', type: 'essay', question: questionText, answer }),
  };
}

/** Legacy: có cột Loại (mcq/essay) — vẫn đọc được file cũ */
function parseLegacyTypedRow(cells: string[]): { question: Question; categoryName: string | null } | { error: string } {
  const categoryName = (cells[0] ?? '').trim() || null;
  const typeCell = cells[1] ?? '';
  const questionText = (cells[2] ?? '').trim();
  const answerOrOptions = (cells[3] ?? '').trim();
  const extraAnswer = (cells[4] ?? '').trim();

  const type = parseQuestionTypeInput(typeCell) ?? (parseMcqOptions(answerOrOptions).length >= 2 ? 'mcq' : 'essay');

  if (!questionText) {
    return { error: 'Thiếu nội dung câu hỏi' };
  }

  if (type === 'mcq') {
    const options = parseMcqOptions(answerOrOptions);
    const answer = extraAnswer || options.find((item) => item === answerOrOptions) || answerOrOptions;
    if (!options.length) {
      return { error: 'Cột phương án không đọc được (mỗi lựa chọn một dòng, VD: A. ...)' };
    }
    if (!answer) {
      return { error: 'Thiếu đáp án đúng' };
    }
    return {
      categoryName,
      question: normalizeQuestion({ categoryId: '', type: 'mcq', question: questionText, options, answer }),
    };
  }

  if (!answerOrOptions) {
    return { error: 'Thiếu phương án hoặc đáp án đúng' };
  }

  return {
    categoryName,
    question: normalizeQuestion({ categoryId: '', type: 'essay', question: questionText, answer: answerOrOptions }),
  };
}

function parseLegacyHybridRow(cells: string[]): { question: Question; categoryName: string | null } | { error: string } {
  const questionText = (cells[0] ?? '').trim();
  const optionsRaw = (cells[1] ?? '').trim();
  const answer = (cells[2] ?? '').trim();

  if (!questionText) {
    return { error: 'Thiếu nội dung câu hỏi' };
  }

  if (optionsRaw) {
    const options = parseMcqOptions(optionsRaw);
    if (!options.length) {
      return { error: 'Cột phương án không đọc được (mỗi lựa chọn một dòng, VD: A. ...)' };
    }
    if (!answer) {
      return { error: 'Thiếu đáp án đúng' };
    }
    return {
      categoryName: null,
      question: normalizeQuestion({ categoryId: '', type: 'mcq', question: questionText, options, answer }),
    };
  }

  if (!answer) {
    return { error: 'Thiếu phương án hoặc đáp án đúng' };
  }

  return {
    categoryName: null,
    question: normalizeQuestion({ categoryId: '', type: 'essay', question: questionText, answer }),
  };
}

function parseLegacyTwoColRow(cells: string[]): { question: Question; categoryName: string | null } | { error: string } {
  const questionText = (cells[0] ?? '').trim();
  const answer = (cells[1] ?? '').trim();

  if (!questionText) {
    return { error: 'Thiếu nội dung câu hỏi' };
  }
  if (!answer) {
    return { error: 'Thiếu đáp án' };
  }

  return {
    categoryName: null,
    question: normalizeQuestion({ categoryId: '', type: 'essay', question: questionText, answer }),
  };
}

/**
 * Parse Excel — hỗ trợ:
 * 1. Chuẩn (4 cột): Lĩnh vực | Câu hỏi | Options | Đáp án đúng
 *    - Options có dữ liệu → MCQ; Options trống → Essay (đáp án ở cột 4)
 *    - MCQ nhiều đáp án: cùng format MCQ, cột đáp án ghi 2+ đáp án (VD: A, C hoặc A; C)
 * 2. Legacy hybrid (3 cột): Câu hỏi | Phương án | Đáp án đúng
 * 3. Legacy 2 cột: Câu hỏi | Đáp án
 * 4. Legacy typed (có cột Loại): file Excel cũ vẫn import được
 */
export function parseQuestionsFromSheet(file: ArrayBuffer): ImportResult {
  const workbook = XLSX.read(file, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  const importedRows: ImportedQuestionRow[] = [];
  const diagnostics = [] as ImportResult['diagnostics'];
  const stats = emptyImportStats();

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 1;
    const cells = trimTrailingEmptyCells(
      Array.isArray(row) ? row.map((cell) => String(cell ?? '').trim()) : [],
    );

    if (!cells.length || cells.every((cell) => !cell)) {
      diagnostics.push({ rowNumber, reason: 'Dòng trống', rawData: cells });
      stats.skipped += 1;
      continue;
    }

    if (index === 0 && isHeaderRow(cells)) {
      continue;
    }

    const format = detectSheetFormat(cells);
    const parsed =
      format === 'category-four-col'
        ? parseCategoryFourColRow(cells)
        : format === 'legacy-typed'
          ? parseLegacyTypedRow(cells)
          : format === 'legacy-hybrid'
            ? parseLegacyHybridRow(cells)
            : parseLegacyTwoColRow(cells);

    if ('error' in parsed) {
      diagnostics.push({ rowNumber, reason: parsed.error, rawData: cells });
      stats.skipped += 1;
      continue;
    }

    if (parsed.question.type !== 'mcq') {
      diagnostics.push({
        rowNumber,
        reason: 'Chỉ hỗ trợ câu trắc nghiệm — cần cột Phương án (A/B/C/D)',
        rawData: cells,
      });
      stats.skipped += 1;
      continue;
    }

    importedRows.push({ question: parsed.question, categoryName: parsed.categoryName });
    bumpCategoryStats(stats, parsed.categoryName, parsed.question.type);
  }

  return {
    rows: importedRows,
    questions: importedRows.map((item) => item.question),
    stats,
    diagnostics,
  };
}
