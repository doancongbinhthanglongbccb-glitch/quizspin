import type { Question, QuestionDraft, QuestionType } from '../types';
import { DEFAULTS } from '../config';
import { uid } from './uid';

function normalizeText(value: string): string {
  return value.trim();
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

/** Shared with Excel import — not part of the public data barrel. */
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

function inferQuestionType(input: { type?: QuestionType; options?: string[] }): QuestionType {
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
function migrateQuestion(raw: unknown): Question | null {
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
