import * as XLSX from 'xlsx';
import type { AppState, Category, ImportResult, PunishmentItem, Question, RewardItem, Settings, WheelSegment } from './types';
import { DEFAULT_PALETTE, DEFAULT_FIXED_SEGMENTS } from './config';

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

export function defaultSettings(): Settings {
  return {
    timer: 30,
    sound: true,
    gifts: ['Được cộng thêm 10 điểm', 'Nghỉ 1 lượt miễn phí'].map(createRewardItem),
    punishments: ['Chống đẩy 10 cái', 'Hát 1 bài'].map(createPunishmentItem),
  };
}

export function createSampleState(): AppState {
  return {
    settings: defaultSettings(),
    categories: [
      {
        id: uid(),
        name: 'Lịch sử',
        color: DEFAULT_PALETTE[0],
        questions: [
          {
            id: uid(),
            question: 'Việt Nam giành độc lập vào năm nào?',
            options: ['A. 1945', 'B. 1954', 'C. 1975', 'D. 1986'],
            answer: 'A. 1945',
          },
        ],
      },
      {
        id: uid(),
        name: 'Khoa học',
        color: DEFAULT_PALETTE[1],
        questions: [
          {
            id: uid(),
            question: 'Nước sôi ở bao nhiêu độ C ở mực nước biển?',
            options: ['A. 80', 'B. 90', 'C. 100', 'D. 120'],
            answer: 'C. 100',
          },
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

export function normalizeQuestion(input: Partial<Question> & { question: string; answer: string; options?: string[] }): Question {
  return {
    id: input.id ?? uid(),
    question: input.question.trim(),
    options: (input.options ?? []).map((item) => item.trim()).filter(Boolean),
    answer: input.answer.trim(),
  };
}

export function availableQuestion(questionList: Question[], usedQuestionIds: Set<string>): Question | null {
  const unused = questionList.filter((item) => !usedQuestionIds.has(item.id));
  const source = unused.length > 0 ? unused : questionList;
  if (source.length === 0) {
    return null;
  }
  const selected = source[Math.floor(Math.random() * source.length)];
  return selected;
}

export function resetUsedFlags(questionList: Question[]): Question[] {
  return questionList.map((question) => ({ ...question }));
}

export function buildWheelSegments(categories: Category[]): WheelSegment[] {
  return [...DEFAULT_FIXED_SEGMENTS, ...categories.map((category) => ({
    id: category.id,
    label: category.name,
    kind: 'category' as const,
    color: category.color,
    categoryId: category.id,
  }))];
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

export function parseQuestionsFromSheet(file: ArrayBuffer): ImportResult {
  const workbook = XLSX.read(file, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  const questions: Question[] = [];
  const diagnostics = [] as ImportResult['diagnostics'];

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 1;
    const cells = Array.isArray(row) ? row.map((cell) => String(cell ?? '').trim()) : [];
    if (!cells.length || cells.every((cell) => !cell)) {
      diagnostics.push({ rowNumber, reason: 'Empty row', rawData: cells });
      continue;
    }

    const questionText = cells[0] ?? '';
    const second = cells[1] ?? '';
    const third = cells[2] ?? '';

    // Detect format: Col B has content = MCQ, Col B empty = essay
    const isMCQ = second.trim().length > 0;
    const options = isMCQ
      ? second.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
      : [];
    const answer = third || '';

    if (!questionText) {
      diagnostics.push({ rowNumber, reason: 'Missing question', rawData: cells });
      continue;
    }

    if (!answer || (isMCQ && !third)) {
      diagnostics.push({ rowNumber, reason: 'Missing answer', rawData: cells });
      continue;
    }

    if (cells.length > 3) {
      diagnostics.push({ rowNumber, reason: 'Unsupported format', rawData: cells });
      continue;
    }

    questions.push(
      normalizeQuestion({
        question: questionText,
        options,
        answer,
      }),
    );
  }

  return { questions, diagnostics };
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
