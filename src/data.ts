import * as XLSX from 'xlsx';
import type {
  AppState,
  Category,
  ImportResult,
  ImportStats,
  ImportedQuestionRow,
  IntroLinkSettings,
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
import { MAX_INTRO_LINKS } from './types';
import { DEFAULT_PALETTE, DEFAULTS, DEFAULT_TIMER_SEC } from './config';

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

function normalizeMcqText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function stripMcqPrefix(value: string): string {
  return normalizeMcqText(value).replace(/^[A-Da-d][.):\-\s]+/i, '').trim();
}

function mcqOptionLetter(value: string): string | null {
  const trimmed = normalizeMcqText(value);
  const match = trimmed.match(/^([A-Da-d])[.):\-\s]/i);
  if (match) {
    return match[1].toUpperCase();
  }
  // Lựa chọn đã lưu dạng chữ cái thuần (MCQ nhiều đáp án: "A, C")
  if (/^[A-Da-d]$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  return null;
}

/** Chỉ chữ cái lựa chọn: A, A., đáp án C — không phải nội dung dài. */
function isLetterOnlyChoice(part: string): boolean {
  const trimmed = normalizeMcqText(part);
  if (!trimmed) {
    return false;
  }
  if (/^(?:đáp\s*án|câu)\s*[A-Da-d]([.):\-\s]*)$/i.test(trimmed)) {
    return true;
  }
  if (/^[A-Da-d]([.):\-\s]*)$/i.test(trimmed)) {
    return true;
  }
  return false;
}

function isNumberOnlyChoice(part: string): boolean {
  return /^[1-4]([.):\-\s]*)$/.test(normalizeMcqText(part));
}

function optionNumberPrefix(option: string): string | null {
  const match = normalizeMcqText(option).match(/^([1-4])[.):\-\s]/);
  return match ? match[1] : null;
}

/** Lấy chữ cái A–D từ phần đáp án (hỗ trợ "đáp án A", fullwidth). */
function extractChoiceLetter(part: string): string | null {
  const trimmed = normalizeMcqText(part);
  const labeled = trimmed.match(/^(?:đáp\s*án|câu)\s*([A-Da-d])([.):\-\s]*)$/i);
  if (labeled) {
    return labeled[1].toUpperCase();
  }
  return mcqOptionLetter(trimmed);
}

/**
 * Tách nhiều đáp án (A, C) — chỉ khi mọi phần đều là chữ cái/số lựa chọn.
 * Tránh cắt nhầm nội dung có dấu phẩy: "A. Hà Nội, thủ đô".
 */
function parseMcqSelectionParts(raw: string): string[] {
  const normalized = normalizeMcqText(raw);
  if (!normalized) {
    return [];
  }

  const rough = normalized
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (rough.length > 1 && rough.every((part) => isLetterOnlyChoice(part) || isNumberOnlyChoice(part))) {
    return rough;
  }

  return [normalized];
}

/** MCQ nhiều đáp án đúng — answer dạng A, C / A; C */
export function isMultipleMcqQuestion(question: Question): boolean {
  if (!isMcqQuestion(question)) {
    return false;
  }
  return parseMcqSelectionParts(question.answer).length > 1;
}

function canonicalizeMcqSelection(raw: string, question: Question): string {
  const parts = raw
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (!parts.length) {
    return '';
  }

  const letters = parts.map((part) => {
    const letter = extractChoiceLetter(part);
    if (letter) {
      return letter;
    }
    const options = getQuestionOptions(question);
    const idx = options.findIndex(
      (option) =>
        option === part || stripMcqPrefix(option).toLowerCase() === stripMcqPrefix(part).toLowerCase(),
    );
    if (idx >= 0) {
      return String.fromCharCode(65 + idx);
    }
    return stripMcqPrefix(part).toUpperCase();
  });

  return [...new Set(letters)].sort().join(',');
}

function resolveOptionLetter(option: string, question: Question): string | null {
  const trimmed = option.trim();
  const letter = mcqOptionLetter(trimmed);
  if (letter) {
    return letter;
  }

  const idx = getQuestionOptions(question).findIndex(
    (entry) =>
      entry === trimmed || stripMcqPrefix(entry).toLowerCase() === stripMcqPrefix(trimmed).toLowerCase(),
  );
  return idx >= 0 ? String.fromCharCode(65 + idx) : null;
}

function selectionToLetters(raw: string, question: Question): string[] {
  return [
    ...new Set(
      parseMcqSelectionParts(raw)
        .map((part) => extractChoiceLetter(part) ?? resolveOptionLetter(part, question))
        .filter((letter): letter is string => Boolean(letter)),
    ),
  ];
}

/** Kiểm tra phương án đang được chọn (hỗ trợ MCQ nhiều đáp án) */
export function isMcqOptionSelected(playerAnswer: string, option: string, question: Question): boolean {
  const player = playerAnswer.trim();
  const opt = option.trim();
  if (!player || !opt) {
    return false;
  }

  if (isMultipleMcqQuestion(question)) {
    const letter = resolveOptionLetter(opt, question);
    return letter ? selectionToLetters(player, question).includes(letter) : false;
  }

  if (player === opt) {
    return true;
  }

  const playerCore = stripMcqPrefix(player).toLowerCase();
  const optCore = stripMcqPrefix(opt).toLowerCase();
  if (playerCore && optCore && playerCore === optCore) {
    return true;
  }

  const playerLetter = mcqOptionLetter(player);
  const optLetter = resolveOptionLetter(opt, question);
  return Boolean(playerLetter && optLetter && playerLetter === optLetter);
}

/** Bật/tắt phương án — MCQ nhiều đáp án lưu dạng A, B, C */
export function toggleMcqPlayerSelection(playerAnswer: string, option: string, question: Question): string {
  const opt = option.trim();
  if (!opt) {
    return playerAnswer;
  }

  if (!isMultipleMcqQuestion(question)) {
    return opt;
  }

  const letter = resolveOptionLetter(opt, question);
  if (!letter) {
    return playerAnswer;
  }

  const letters = selectionToLetters(playerAnswer, question);
  const next = letters.includes(letter) ? letters.filter((item) => item !== letter) : [...letters, letter];
  return [...new Set(next)].sort().join(', ');
}

/** So khớp đáp án MCQ linh hoạt: chữ cái, nội dung, hoặc chuỗi đầy đủ */
export function isMcqAnswerCorrect(playerAnswer: string, question: Question): boolean {
  if (!isMcqQuestion(question)) {
    return false;
  }

  const player = playerAnswer.trim();
  const correct = question.answer.trim();
  if (!player || !correct) {
    return false;
  }

  if (isMultipleMcqQuestion(question)) {
    return canonicalizeMcqSelection(player, question) === canonicalizeMcqSelection(correct, question);
  }

  if (player === correct) {
    return true;
  }

  const playerCore = stripMcqPrefix(player).toLowerCase();
  const correctCore = stripMcqPrefix(correct).toLowerCase();
  if (playerCore && correctCore && playerCore === correctCore) {
    return true;
  }

  const playerLetter = mcqOptionLetter(player);
  const correctLetter = mcqOptionLetter(correct);
  if (playerLetter && correctLetter && playerLetter === correctLetter) {
    return true;
  }

  const options = getQuestionOptions(question);
  const matchedOption = options.find(
    (option) => option === player || stripMcqPrefix(option).toLowerCase() === playerCore,
  );
  if (matchedOption && (matchedOption === correct || stripMcqPrefix(matchedOption).toLowerCase() === correctCore)) {
    return true;
  }

  return false;
}

/** Một phương án có thuộc đáp án đúng không (review / tô màu từng option) */
export function isMcqCorrectOption(option: string, question: Question): boolean {
  if (!isMcqQuestion(question)) {
    return false;
  }

  if (isMultipleMcqQuestion(question)) {
    const letter = resolveOptionLetter(option, question);
    return letter ? selectionToLetters(question.answer, question).includes(letter) : false;
  }

  return isMcqAnswerCorrect(option, question);
}

/**
 * Kiểm tra đáp án MCQ khớp cột phương án.
 * - Chữ cái A/B/C/D: chỉ hợp lệ khi có phương án mang đúng chữ đó (A. / A) …)
 * - Số 1–4: chỉ hợp lệ khi có phương án mang đúng số đó (1. / 1) …)
 * - Nội dung: phải trùng cả dòng hoặc phần sau tiền tố của một phương án
 * - Nhiều đáp án: chỉ khi dạng A, C (không cắt nội dung có dấu phẩy)
 */
export function mcqAnswerMatchesOptions(answer: string, options: string[]): boolean {
  const cleaned = options.map((item) => normalizeMcqText(item)).filter(Boolean);
  if (!cleaned.length) {
    return false;
  }

  const parts = parseMcqSelectionParts(answer);
  if (!parts.length) {
    return false;
  }

  return parts.every((part) => {
    const trimmed = normalizeMcqText(part);

    if (isNumberOnlyChoice(trimmed)) {
      const num = trimmed.match(/^([1-4])/)?.[1];
      return Boolean(num && cleaned.some((option) => optionNumberPrefix(option) === num));
    }

    if (isLetterOnlyChoice(trimmed)) {
      const letter = extractChoiceLetter(trimmed);
      return Boolean(letter && cleaned.some((option) => mcqOptionLetter(option) === letter));
    }

    const core = stripMcqPrefix(trimmed).toLowerCase();
    if (!core) {
      return false;
    }

    return cleaned.some(
      (option) =>
        normalizeMcqText(option) === trimmed || stripMcqPrefix(option).toLowerCase() === core,
    );
  });
}

export function getQuestionOptions(question: Question): string[] {
  return question.options ?? [];
}

export function questionTypeLabel(type: QuestionType): string {
  return type === 'mcq' ? 'Trắc nghiệm' : 'Tự luận';
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

export const DEFAULT_INTRO_LINK_LABEL = 'Kiểm tra nhận thức';

function normalizeIntroLinkEntry(raw: unknown, index: number): IntroLinkSettings {
  const item = raw as Partial<IntroLinkSettings> | undefined;
  const label = typeof item?.label === 'string' ? item.label.trim() : '';
  const url = typeof item?.url === 'string' ? item.url.trim() : '';
  return {
    label: label || (index === 0 ? DEFAULT_INTRO_LINK_LABEL : ''),
    url,
  };
}

export function defaultIntroLinks(): IntroLinkSettings[] {
  return [];
}

/** @deprecated Dùng defaultIntroLinks */
export function defaultIntroLinkSettings(): IntroLinkSettings {
  return { label: DEFAULT_INTRO_LINK_LABEL, url: '' };
}

export function compactIntroLinks(links: IntroLinkSettings[]): IntroLinkSettings[] {
  return links
    .map((item, index) => normalizeIntroLinkEntry(item, index))
    .filter((item) => item.label || item.url)
    .slice(0, MAX_INTRO_LINKS);
}

export function normalizeIntroLinks(
  raw: unknown,
  legacySingle?: IntroLinkSettings,
): IntroLinkSettings[] {
  let links: IntroLinkSettings[] = [];

  if (Array.isArray(raw)) {
    links = raw.map((item, index) => normalizeIntroLinkEntry(item, index));
  } else if (legacySingle) {
    links = [normalizeIntroLinkEntry(legacySingle, 0)];
  }

  return compactIntroLinks(links);
}

export function getVisibleIntroLinks(links: IntroLinkSettings[]): IntroLinkSettings[] {
  return links.filter((item) => item.url.trim());
}

export function defaultSettings(): Settings {
  return {
    timer: DEFAULT_TIMER_SEC,
    sound: true,
    gifts: ['Được cộng thêm 10 điểm', 'Nghỉ 1 lượt miễn phí'].map(createRewardItem),
    punishments: ['Chống đẩy 10 cái', 'Hát 1 bài'].map(createPunishmentItem),
    sounds: {
      bindings: {},
      library: [],
    },
    introLinks: defaultIntroLinks(),
  };
}

export function createSampleState(): AppState {
  const historyId = uid();
  const scienceId = uid();

  return {
    settings: defaultSettings(),
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
  introBed: 'Nhạc nền Intro',
  spinBed: 'Nhạc nền khi quay',
  spinStart: 'Tiếng quay bánh xe',
  spinStop: 'Tiếng dừng quay',
  correct: 'Trả lời đúng',
  wrong: 'Trả lời sai',
  countdown: 'Tick đếm giờ (mỗi giây)',
  fanfare: 'Fanfare',
  gift: 'Trúng quà tặng',
  punishment: 'Trúng xử phạt',
};

export function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Bốc ngẫu nhiên tối đa `maxCount` câu chưa dùng; tự reset khi hết */
export function pickQuestionsFromCategory(
  category: Category,
  usedIds: string[],
  maxCount: number,
): { questions: Question[]; usedIds: string[] } {
  let used = [...usedIds];
  let unused = category.questions.filter((item) => !used.includes(item.id));

  if (unused.length === 0 && category.questions.length > 0) {
    used = [];
    unused = [...category.questions];
  }

  const picked = shuffleArray(unused).slice(0, Math.min(maxCount, unused.length));
  const newUsed = [...used, ...picked.map((item) => item.id)];
  return { questions: picked, usedIds: newUsed };
}

export function findQuestionById(categories: Category[], questionId: string): Question | null {
  for (const category of categories) {
    const found = category.questions.find((item) => item.id === questionId);
    if (found) {
      return found;
    }
  }
  return null;
}

export function buildWheelSegments(categories: Category[]): WheelSegment[] {
  return categories.map(
    (category): WheelSegment => ({
      id: category.id,
      label: category.name,
      kind: 'category',
      color: category.color,
      categoryId: category.id,
    }),
  );
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

export function rewardItemsToText(items: Array<{ text: string }>): string {
  return items.map((item) => item.text).join('\n');
}

export function textToRewardItems<T extends { id: string; text: string }>(text: string, existing: T[], createItem: (text: string) => T): T[] {
  const lines = text.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  const byText = new Map(existing.map((item) => [item.text.trim(), item]));

  return lines.map((line) => {
    const matched = byText.get(line);
    if (matched) {
      return { ...matched, text: line };
    }
    return createItem(line);
  });
}
