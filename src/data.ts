import * as XLSX from 'xlsx';
import type {
  AppState,
  AnswerRecord,
  Category,
  ImportResult,
  ImportStats,
  ImportedQuestionRow,
  PunishmentItem,
  Question,
  QuestionDraft,
  QuestionFilter,
  QuestionType,
  RewardItem,
  Settings,
  SoundEventKey,
  WheelSegment,
} from './types';
import { DEFAULT_PALETTE, DEFAULT_FIXED_SEGMENTS, DEFAULTS } from './config';

function uid(): string {
  return crypto.randomUUID();
}

function createRewardItem(text: string): RewardItem {
  return { id: uid(), text };
}

function createPunishmentItem(text: string): PunishmentItem {
  return { id: uid(), text };
}

function normalizeText(value: string): string {
  return value.trim();
}

function emptyImportStats(): ImportStats {
  return { total: 0, mcq: 0, essay: 0, skipped: 0, byCategory: {} };
}

// ─── Question type helpers ───────────────────────────────────────────

export function isMcqQuestion(question: Question): boolean {
  return question.type === 'mcq';
}

export function isEssayQuestion(question: Question): boolean {
  return question.type === 'essay';
}

export function getQuestionOptions(question: Question): string[] {
  return question.options ?? [];
}

export function questionTypeLabel(type: QuestionType): string {
  return type === 'mcq' ? 'Trắc nghiệm' : 'Tự luận';
}

export function questionTypeIcon(type: QuestionType): string {
  return type === 'mcq' ? '🔤' : '📝';
}

export function parseQuestionTypeInput(value: string): QuestionType | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (['mcq', 'trac nghiem', 'trắc nghiệm', 'tn', 'abcd', 'choice'].some((token) => normalized.includes(token.replace(' ', '')) || normalized === token)) {
    return 'mcq';
  }
  if (['essay', 'tu luan', 'tự luận', 'tl', 'text'].some((token) => normalized.includes(token.replace(' ', '')) || normalized === token)) {
    return 'essay';
  }
  return null;
}

/** Parse chuỗi options MCQ: hỗ trợ xuống dòng, `;` hoặc `,` */
export function parseMcqOptions(raw: string): string[] {
  const normalized = raw.trim();
  if (!normalized) {
    return [];
  }

  const byLine = normalized.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  if (byLine.length > 1) {
    return byLine;
  }

  if (normalized.includes(';')) {
    return normalized.split(';').map((item) => item.trim()).filter(Boolean);
  }

  if (normalized.includes(',')) {
    return normalized.split(',').map((item) => item.trim()).filter(Boolean);
  }

  return byLine;
}

export function inferQuestionType(input: { type?: QuestionType; options?: string[] }): QuestionType {
  if (input.type) {
    return input.type;
  }
  const options = (input.options ?? []).map((item) => item.trim()).filter(Boolean);
  return options.length > 0 ? 'mcq' : 'essay';
}

export type NormalizeQuestionInput = {
  id?: string;
  categoryId: string;
  type?: QuestionType;
  question: string;
  options?: string[] | string;
  answer: string;
  points?: number;
};

export function normalizeQuestion(input: NormalizeQuestionInput): Question {
  const question = input.question.trim();
  const answer = input.answer.trim();
  const id = input.id ?? uid();
  const categoryId = input.categoryId;
  const type = inferQuestionType({
    type: input.type,
    options: Array.isArray(input.options)
      ? input.options
      : typeof input.options === 'string'
        ? parseMcqOptions(input.options)
        : [],
  });
  const points = input.points ?? DEFAULTS.questionPoints;

  if (type === 'mcq') {
    const rawOptions = Array.isArray(input.options)
      ? input.options
      : typeof input.options === 'string'
        ? parseMcqOptions(input.options)
        : [];
    const options = rawOptions.map((item) => item.trim()).filter(Boolean);
    return {
      id,
      categoryId,
      type: 'mcq',
      question,
      options,
      answer,
      points,
    };
  }

  return {
    id,
    categoryId,
    type: 'essay',
    question,
    answer,
    points,
  };
}

/** Migrate dữ liệu cũ (không có `type`, có thể có `options`) */
export function migrateQuestion(raw: unknown): Question | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const candidate = raw as {
    id?: unknown;
    categoryId?: unknown;
    type?: unknown;
    question?: unknown;
    answer?: unknown;
    options?: unknown;
    points?: unknown;
  };

  const question = typeof candidate.question === 'string' ? candidate.question.trim() : '';
  const answer = typeof candidate.answer === 'string' ? candidate.answer.trim() : '';
  if (!question || !answer) {
    return null;
  }

  const id = typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id.trim() : uid();
  const categoryId = typeof candidate.categoryId === 'string' ? candidate.categoryId.trim() : '';
  const explicitType = typeof candidate.type === 'string' ? parseQuestionTypeInput(candidate.type) : null;
  const options = Array.isArray(candidate.options)
    ? candidate.options.map((item) => String(item ?? '').trim()).filter(Boolean)
    : [];
  const points = typeof candidate.points === 'number' ? candidate.points : undefined;

  return normalizeQuestion({
    id,
    categoryId,
    type: explicitType ?? undefined,
    question,
    answer,
    options,
    points,
  });
}

export function migrateCategoryQuestions(categoryId: string, questions: unknown[]): Question[] {
  return questions
    .map((item) => {
      const migrated = migrateQuestion(item);
      if (!migrated) {
        return null;
      }
      return { ...migrated, categoryId: migrated.categoryId || categoryId };
    })
    .filter((item): item is Question => Boolean(item));
}

export function filterQuestions(questions: Question[], filter: QuestionFilter): Question[] {
  if (filter === 'all') {
    return questions;
  }
  return questions.filter((item) => item.type === filter);
}

export function countQuestionsByType(questions: Question[]): { mcq: number; essay: number; total: number } {
  const mcq = questions.filter(isMcqQuestion).length;
  return { mcq, essay: questions.length - mcq, total: questions.length };
}

export function defaultQuestionDraft(type: QuestionType = 'mcq'): QuestionDraft {
  return { type, question: '', options: '', answer: '' };
}

export function questionToDraft(question: Question): QuestionDraft {
  return {
    type: question.type,
    question: question.question,
    options: getQuestionOptions(question).join('\n'),
    answer: question.answer,
  };
}

// ─── App state ───────────────────────────────────────────────────────

export function defaultSettings(): Settings {
  return {
    timer: 30,
    sound: true,
    gifts: ['Được cộng thêm 10 điểm', 'Nghỉ 1 lượt miễn phí'].map(createRewardItem),
    punishments: ['Chống đẩy 10 cái', 'Hát 1 bài'].map(createPunishmentItem),
    sounds: {
      bindings: {},
      library: [],
    },
  };
}

export function createSampleState(): AppState {
  const historyId = uid();
  const scienceId = uid();

  return {
    settings: defaultSettings(),
    answerHistory: [],
    categories: [
      {
        id: historyId,
        name: 'Lịch sử',
        color: DEFAULT_PALETTE[0],
        questions: [
          normalizeQuestion({
            categoryId: historyId,
            type: 'mcq',
            question: 'Việt Nam giành độc lập vào năm nào?',
            options: ['A. 1945', 'B. 1954', 'C. 1975', 'D. 1986'],
            answer: 'A. 1945',
          }),
        ],
      },
      {
        id: scienceId,
        name: 'Khoa học',
        color: DEFAULT_PALETTE[1],
        questions: [
          normalizeQuestion({
            categoryId: scienceId,
            type: 'mcq',
            question: 'Nước sôi ở bao nhiêu độ C ở mực nước biển?',
            options: ['A. 80', 'B. 90', 'C. 100', 'D. 120'],
            answer: 'C. 100',
          }),
          normalizeQuestion({
            categoryId: scienceId,
            type: 'essay',
            question: 'Trình bày vai trò của nước trong đời sống con người?',
            answer: 'Nước tham gia trao đổi chất, điều hòa thân nhiệt, vận chuyển dinh dưỡng...',
          }),
        ],
      },
    ],
  };
}

export function makeCategory(name: string): Category {
  return {
    id: uid(),
    name,
    color: DEFAULT_PALETTE[Math.floor(Math.random() * DEFAULT_PALETTE.length)],
    questions: [],
  };
}

export const SOUND_EVENT_LABELS: Record<SoundEventKey, string> = {
  spinBed: 'Nhạc nền khi quay',
  spinStart: 'Tiếng quay bánh xe',
  spinStop: 'Tiếng dừng quay',
  correct: 'Trả lời đúng',
  wrong: 'Trả lời sai',
  countdown: 'Tick đếm giờ (mỗi giây)',
  fanfare: 'Fanfare',
  gift: 'Trúng quà tặng',
  punishment: 'Trúng xử phạt',
  extraTurn: 'Thêm lượt',
  loseTurn: 'Mất lượt',
};

export function findQuestionById(appState: AppState, questionId: string): Question | null {
  for (const category of appState.categories) {
    const match = category.questions.find((item) => item.id === questionId);
    if (match) {
      return match;
    }
  }
  return null;
}

export function formatAnswerTime(timeSpentMs?: number): string {
  if (typeof timeSpentMs !== 'number' || timeSpentMs < 0) {
    return '—';
  }

  const totalSeconds = Math.max(0, Math.round(timeSpentMs / 1000));
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export function summarizeAnswerRecord(appState: AppState, record: AnswerRecord): { label: string; timeLabel: string } {
  const question = findQuestionById(appState, record.questionId);
  const raw = question?.question?.trim() || 'Câu hỏi đã xóa';
  const label = raw.length > 72 ? `${raw.slice(0, 72)}…` : raw;
  return { label, timeLabel: formatAnswerTime(record.timeSpentMs) };
}

export function availableQuestion(questionList: Question[], usedQuestionIds: Set<string>): Question | null {
  const unused = questionList.filter((item) => !usedQuestionIds.has(item.id));
  const source = unused.length > 0 ? unused : questionList;
  if (source.length === 0) {
    return null;
  }
  return source[Math.floor(Math.random() * source.length)];
}

export function resetUsedFlags(questionList: Question[]): Question[] {
  return questionList.map((question) => ({ ...question }));
}

export function buildWheelSegments(categories: Category[]): WheelSegment[] {
  return [
    ...DEFAULT_FIXED_SEGMENTS,
    ...categories.map(
      (category): WheelSegment => ({
        id: category.id,
        label: category.name,
        kind: 'category',
        color: category.color,
        categoryId: category.id,
      }),
    ),
  ];
}

export function randomGift(items: string[]): string {
  if (items.length === 0) {
    return 'Chưa có dữ liệu.';
  }
  return items[Math.floor(Math.random() * items.length)];
}

export function migrateRewardItems<T extends { id: string; text: string }>(items: unknown, createItem: (text: string) => T): T[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      if (typeof item === 'string') {
        const text = normalizeText(item);
        return text ? createItem(text) : null;
      }
      if (item && typeof item === 'object') {
        const candidate = item as { id?: unknown; text?: unknown };
        const text = typeof candidate.text === 'string' ? normalizeText(candidate.text) : '';
        const id = typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id.trim() : uid();
        if (!text) {
          return null;
        }
        return { id, text };
      }
      return null;
    })
    .filter((item): item is T => Boolean(item));
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
    joined.includes('loại') ||
    joined.includes('loai')
  );
}

type SheetFormat = 'category-four-col' | 'legacy-typed' | 'legacy-hybrid' | 'legacy-two-col';

function detectSheetFormat(cells: string[]): SheetFormat {
  const col1IsType = Boolean(parseQuestionTypeInput(cells[1] ?? ''));

  // Legacy: Lĩnh vực | Loại | Câu hỏi | Options/Đáp án [| Đáp án đúng]
  if (cells.length >= 5 || (cells.length >= 4 && col1IsType)) {
    return 'legacy-typed';
  }

  if (cells.length >= 4) {
    return 'category-four-col';
  }

  if (cells.length === 3) {
    return 'legacy-hybrid';
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
    return { error: 'Missing question' };
  }

  if (optionsRaw) {
    const options = parseMcqOptions(optionsRaw);
    if (!options.length) {
      return { error: 'MCQ requires options' };
    }
    if (!answer) {
      return { error: 'Missing MCQ answer' };
    }
    return {
      categoryName,
      question: normalizeQuestion({ categoryId: '', type: 'mcq', question: questionText, options, answer }),
    };
  }

  if (!answer) {
    return { error: 'Missing essay answer' };
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
    return { error: 'Missing question' };
  }

  if (type === 'mcq') {
    const options = parseMcqOptions(answerOrOptions);
    const answer = extraAnswer || options.find((item) => item === answerOrOptions) || answerOrOptions;
    if (!options.length) {
      return { error: 'MCQ requires options' };
    }
    if (!answer) {
      return { error: 'Missing MCQ answer' };
    }
    return {
      categoryName,
      question: normalizeQuestion({ categoryId: '', type: 'mcq', question: questionText, options, answer }),
    };
  }

  if (!answerOrOptions) {
    return { error: 'Missing essay answer' };
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
    return { error: 'Missing question' };
  }

  if (optionsRaw) {
    const options = parseMcqOptions(optionsRaw);
    if (!answer) {
      return { error: 'Missing MCQ answer' };
    }
    return {
      categoryName: null,
      question: normalizeQuestion({ categoryId: '', type: 'mcq', question: questionText, options, answer }),
    };
  }

  if (!answer) {
    return { error: 'Missing essay answer' };
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
    return { error: 'Missing question' };
  }
  if (!answer) {
    return { error: 'Missing answer' };
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
    const cells = Array.isArray(row) ? row.map((cell) => String(cell ?? '').trim()) : [];

    if (!cells.length || cells.every((cell) => !cell)) {
      diagnostics.push({ rowNumber, reason: 'Empty row', rawData: cells });
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

export function rewardItemsToText(items: Array<{ text: string }>): string {
  return items.map((item) => item.text).join('\n');
}

export function textToRewardItems<T extends { id: string; text: string }>(text: string, existing: T[], createItem: (text: string) => T): T[] {
  const lines = text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  return lines.map((line, index) => {
    const existingItem = existing[index];
    if (existingItem) {
      return { ...existingItem, text: line };
    }
    return createItem(line);
  });
}
