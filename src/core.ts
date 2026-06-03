import { App } from '@capacitor/app';
import { KeepAwake } from '@capacitor-community/keep-awake';
import type { ActiveModal, AppState, Category, Question, WheelSegment } from './types';
import {
  availableQuestion,
  buildWheelSegments,
  createSampleState,
  makeCategory,
  migrateRewardItems,
  normalizeQuestion,
  parseQuestionsFromSheet,
  resetUsedFlags,
  rewardItemsToText,
  textToRewardItems,
} from './data';
import { clearState, loadState, saveState } from './storage';
import { DEFAULT_PALETTE, DEFAULTS } from './config';

const appRoot = document.querySelector<HTMLDivElement>('#app');

if (!appRoot) {
  throw new Error('Missing app root');
}

type RuntimeState = {
  tab: 'spin' | 'bank' | 'settings';
  rotation: number;
  spinning: boolean;
  toast: string;
  modal: ActiveModal;
  selectedCategoryId: string | null;
  editingQuestionId: string | null;
  questionDraft: {
    question: string;
    options: string;
    answer: string;
  };
  usedQuestionIds: Set<string>;
  usedGifts: Set<string>;
  usedPunishments: Set<string>;
  importReport: {
    imported: number;
    skipped: number;
    diagnostics: Array<{ rowNumber: number; reason: string; rawData: string[] }>;
  } | null;
};

export const runtime: RuntimeState = {
  tab: 'spin',
  rotation: 0,
  spinning: false,
  toast: '',
  modal: null,
  selectedCategoryId: null,
  editingQuestionId: null,
  questionDraft: {
    question: '',
    options: '',
    answer: '',
  },
  usedQuestionIds: new Set(),
  usedGifts: new Set(),
  usedPunishments: new Set(),
  importReport: null,
};

export let state: AppState = createSampleState();
let timerHandle: number | null = null;
let toastHandle: number | null = null;
let spinHandle: number | null = null;
let answerRevealPlayed = false;

function storageReady(): void {
  void KeepAwake.keepAwake().catch(() => undefined);
}

export let render: () => void = () => {};

export async function setupUI(): Promise<void> {
  const { render: uiRender } = await import('./ui');
  render = uiRender;
}

function setToast(message: string): void {
  runtime.toast = message;
  render();
  if (toastHandle) {
    window.clearTimeout(toastHandle);
  }
  toastHandle = window.setTimeout(() => {
    runtime.toast = '';
    render();
  }, DEFAULTS.toastDurationMs);
}

function persist(): void {
  void saveState(state).catch(() => undefined);
}

function normalizeState(next: AppState): AppState {
  const categories = next.categories.map((category, index) => ({
    ...category,
    color: category.color || DEFAULT_PALETTE[index % DEFAULT_PALETTE.length],
    questions: category.questions.map((question) => ({
      ...question,
      options: question.options ?? [],
    })),
  }));

  return {
    settings: {
      timer: Math.min(DEFAULTS.timerMaxSec, Math.max(DEFAULTS.timerMinSec, next.settings.timer)),
      sound: next.settings.sound,
      gifts: migrateRewardItems(next.settings.gifts, (text) => ({ id: crypto.randomUUID(), text })),
      punishments: migrateRewardItems(next.settings.punishments, (text) => ({ id: crypto.randomUUID(), text })),
    },
    categories,
  };
}

export function setState(update: AppState | ((current: AppState) => AppState)): void {
  state = normalizeState(typeof update === 'function' ? update(state) : update);
  persist();
  render();
}

export function setRuntime(update: Partial<RuntimeState>): void {
  Object.assign(runtime, update);
  render();
}

function rewardTexts(items: Array<{ text: string }>): string[] {
  return items.map((item) => item.text).filter(Boolean);
}

function hasRewardItems(): boolean {
  return rewardTexts(state.settings.gifts).length > 0 && rewardTexts(state.settings.punishments).length > 0;
}

function stopTimer(): void {
  if (timerHandle) {
    window.clearInterval(timerHandle);
    timerHandle = null;
  }
}

function stopSpinTimeout(): void {
  if (spinHandle) {
    window.clearTimeout(spinHandle);
    spinHandle = null;
  }
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine'): void {
  if (!state.settings.sound) {
    return;
  }
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = 0.0001;
  oscillator.connect(gain);
  gain.connect(context.destination);
  const now = context.currentTime;
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration / 1000);
  oscillator.start();
  oscillator.stop(now + duration / 1000);
  oscillator.onended = () => context.close().catch(() => undefined);
}

function startQuestionTimer(): void {
  stopTimer();
  if (!runtime.modal || runtime.modal.kind !== 'question') {
    return;
  }
  timerHandle = window.setInterval(() => {
    if (!runtime.modal || runtime.modal.kind !== 'question' || runtime.modal.paused || runtime.modal.revealed) {
      return;
    }
    const remaining = runtime.modal.remaining - 1;
    runtime.modal.remaining = remaining;
    if (remaining <= 0) {
      runtime.modal.remaining = 0;
      runtime.modal.paused = true;
      playTone(880, 450, 'triangle');
      setToast('Hết giờ');
      stopTimer();
    }
    render();
  }, 1000);
}

export function openQuestionModal(category: Category): void {
  const question = availableQuestion(category.questions, runtime.usedQuestionIds);
  if (!question) {
    setToast(`Lĩnh vực ${category.name} đang trống`);
    return;
  }

  runtime.usedQuestionIds.add(question.id);

  runtime.modal = {
    kind: 'question',
    categoryId: category.id,
    questionId: question.id,
    timer: state.settings.timer,
    paused: false,
    revealed: false,
    remaining: state.settings.timer,
  };
  answerRevealPlayed = false;
  startQuestionTimer();
  render();
}

export function openGiftModal(kind: 'gift' | 'punishment'): void {
  const items = kind === 'gift' ? state.settings.gifts : state.settings.punishments;
  if (!items || items.length === 0) {
    runtime.modal = {
      kind: 'gift',
      title: kind === 'gift' ? 'Quà tặng 🎁' : 'Hình phạt 😈',
      text: 'Chưa có dữ liệu.',
    };
    render();
    return;
  }
  // Use item text as stable key for deduplication across a session.
  const usedSet = kind === 'gift' ? runtime.usedGifts : runtime.usedPunishments;
  const candidates = items.filter((it) => !usedSet.has(it.id));
  let chosen: { id: string; text: string };
  if (candidates.length === 0) {
    usedSet.clear();
    chosen = items[Math.floor(Math.random() * items.length)];
  } else {
    chosen = candidates[Math.floor(Math.random() * candidates.length)];
  }
  usedSet.add(chosen.id);

  runtime.modal = {
    kind: 'gift',
    title: kind === 'gift' ? 'Quà tặng 🎁' : 'Hình phạt 😈',
    text: chosen.text,
  };
  render();
}

export function openNoticeModal(text: string): void {
  runtime.modal = { kind: 'notice', text };
  render();
}

export function closeModal(): void {
  stopTimer();
  runtime.modal = null;
  answerRevealPlayed = false;
  render();
}

export function currentCategory(): Category | null {
  if (!runtime.selectedCategoryId) {
    return state.categories[0] ?? null;
  }
  return state.categories.find((category) => category.id === runtime.selectedCategoryId) ?? state.categories[0] ?? null;
}

export function ensureQuestionDraft(category?: Category | null): void {
  if (!category) {
    runtime.questionDraft = { question: '', options: '', answer: '' };
    return;
  }
  if (runtime.editingQuestionId) {
    const item = category.questions.find((question) => question.id === runtime.editingQuestionId);
    if (item) {
      runtime.questionDraft = {
        question: item.question,
        options: item.options.join('\n'),
        answer: item.answer,
      };
      return;
    }
  }
  runtime.questionDraft = { question: '', options: '', answer: '' };
}

export function selectCategory(categoryId: string): void {
  runtime.selectedCategoryId = categoryId;
  runtime.editingQuestionId = null;
  ensureQuestionDraft(state.categories.find((category) => category.id === categoryId));
  render();
}

export function addCategory(): void {
  const name = window.prompt('Tên lĩnh vực mới?');
  if (!name?.trim()) {
    return;
  }
  const nextCategory = makeCategory(name.trim());
  setState((current) => ({
    ...current,
    categories: [...current.categories, nextCategory],
  }));
  runtime.selectedCategoryId = nextCategory.id;
  ensureQuestionDraft(nextCategory);
  render();
}

export function renameCategory(category: Category): void {
  const name = window.prompt('Đổi tên lĩnh vực', category.name);
  if (!name?.trim()) {
    return;
  }
  setState((current) => ({
    ...current,
    categories: current.categories.map((item) => (item.id === category.id ? { ...item, name: name.trim() } : item)),
  }));
}

export function deleteCategory(category: Category): void {
  if (!window.confirm(`Xóa toàn bộ ${category.questions.length} câu trong ${category.name}?`)) {
    return;
  }
  setState((current) => {
    const next = current.categories.filter((item) => item.id !== category.id);
    return { ...current, categories: next.length ? next : [makeCategory('Lĩnh vực mới')] };
  });
  if (runtime.selectedCategoryId === category.id) {
    runtime.selectedCategoryId = state.categories[0]?.id ?? null;
  }
  ensureQuestionDraft(currentCategory());
  render();
}

export function saveQuestionDraft(): void {
  const category = currentCategory();
  if (!category) {
    return;
  }
  const questionText = runtime.questionDraft.question.trim();
  const answerText = runtime.questionDraft.answer.trim();
  if (!questionText || !answerText) {
    setToast('Cần nhập câu hỏi và đáp án');
    return;
  }
  const options = runtime.questionDraft.options
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  const question = normalizeQuestion({
    id: runtime.editingQuestionId ?? undefined,
    question: questionText,
    options,
    answer: answerText,
  });

  setState((current) => ({
    ...current,
    categories: current.categories.map((item) => {
      if (item.id !== category.id) {
        return item;
      }
      const existingIndex = item.questions.findIndex((entry) => entry.id === question.id);
      const nextQuestions = existingIndex >= 0 ? item.questions.map((entry) => (entry.id === question.id ? question : entry)) : [...item.questions, question];
      return { ...item, questions: nextQuestions };
    }),
  }));

  runtime.editingQuestionId = null;
  ensureQuestionDraft(category);
  setToast('Đã lưu câu hỏi');
}

export function deleteQuestion(categoryId: string, questionId: string): void {
  setState((current) => ({
    ...current,
    categories: current.categories.map((category) =>
      category.id === categoryId
        ? { ...category, questions: category.questions.filter((question) => question.id !== questionId) }
        : category,
    ),
  }));
  runtime.usedQuestionIds.delete(questionId);
  if (runtime.editingQuestionId === questionId) {
    runtime.editingQuestionId = null;
    ensureQuestionDraft(currentCategory());
  }
}

export function resetQuestionFlags(category: Category): void {
  for (const question of category.questions) {
    runtime.usedQuestionIds.delete(question.id);
  }
  setState((current) => ({
    ...current,
    categories: current.categories.map((item) =>
      item.id === category.id ? { ...item, questions: resetUsedFlags(item.questions) } : item,
    ),
  }));
}

export function parseExcelImport(file: File): void {
  const reader = new FileReader();
  reader.onerror = () => setToast('Không thể đọc file Excel');
  reader.onload = () => {
    runtime.importReport = null;
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
        setToast('File không có dữ liệu hợp lệ');
        return;
      }
      setState((current) => ({
        ...current,
        categories: current.categories.map((item) =>
          item.id === category.id ? { ...item, questions: [...item.questions, ...parsed.questions] } : item,
        ),
      }));
      runtime.importReport = {
        imported: parsed.questions.length,
        skipped: parsed.diagnostics.length,
        diagnostics: parsed.diagnostics,
      };
      setToast(`Đã thêm ${parsed.questions.length} câu vào ${category.name}`);
      console.info('Excel import report', runtime.importReport);
    } catch {
      runtime.importReport = null;
      setToast('Định dạng file Excel không hợp lệ');
    }
  };
  reader.readAsArrayBuffer(file);
}

export function clearEverything(): void {
  if (!window.confirm('Bạn chắc chắn muốn xóa toàn bộ dữ liệu?')) {
    return;
  }
  if (!window.confirm('Hành động này không thể hoàn tác. Xác nhận xóa?')) {
    return;
  }
  state = createSampleState();
  runtime.selectedCategoryId = state.categories[0]?.id ?? null;
  runtime.editingQuestionId = null;
  ensureQuestionDraft(currentCategory());
  runtime.usedQuestionIds.clear();
  runtime.usedGifts.clear();
  runtime.usedPunishments.clear();
  runtime.importReport = null;
  void clearState().catch(() => undefined);
  persist();
  render();
  setToast('Đã khôi phục dữ liệu mẫu');
}

export function toggleQuestionPause(): void {
  if (!runtime.modal || runtime.modal.kind !== 'question') {
    return;
  }
  runtime.modal.paused = !runtime.modal.paused;
  if (!runtime.modal.paused) {
    startQuestionTimer();
  }
  render();
}

export function revealAnswer(): void {
  if (!runtime.modal) {
    return;
  }
  if (runtime.modal.kind === 'question') {
    if (!runtime.modal.revealed) {
      runtime.modal.revealed = true;
      runtime.modal.paused = true;
      stopTimer();
      playTone(660, 420, 'triangle');
      render();
      return;
    }
  }
  closeModal();
}

export function saveQuestionEdit(id: string, question: string, options: string, answer: string): void {
  const category = currentCategory();
  if (!category) {
    return;
  }
  setState((current) => ({
    ...current,
    categories: current.categories.map((item) =>
      item.id === category.id
        ? {
            ...item,
            questions: item.questions.map((q) =>
              q.id === id
                ? normalizeQuestion({
                    id,
                    question,
                    options: options.split(/\r?\n/).filter(Boolean),
                    answer,
                  })
                : q,
            ),
          }
        : item,
    ),
  }));
  runtime.editingQuestionId = null;
  ensureQuestionDraft(currentCategory());
}

export function spin(): void {
  if (runtime.spinning || runtime.modal) {
    return;
  }
  if (!hasRewardItems()) {
    setToast('Hãy thêm ít nhất một Quà tặng và một Hình phạt trước khi quay');
    return;
  }
  const segments = buildWheelSegments(state.categories);
  if (!segments.length) {
    setToast('Chưa có dữ liệu để quay');
    return;
  }

  runtime.spinning = true;
  render();
  playTone(160, 260, 'sawtooth');

  const chosen = segments[Math.floor(Math.random() * segments.length)];
  const segmentIndex = segments.findIndex((segment) => segment.id === chosen.id);
  const slice = 360 / segments.length;
  const targetCenter = segmentIndex * slice + slice / 2;
  const normalized = (360 - targetCenter + DEFAULTS.pointerOffsetDeg + 360) % 360;
  const fullTurns = DEFAULTS.spinFullTurns * 360;
  runtime.rotation = runtime.rotation + fullTurns + normalized;
  render();

  spinHandle = window.setTimeout(() => {
    runtime.spinning = false;
    runtime.rotation = runtime.rotation % 360;
    render();

    if (chosen.kind === 'category' && chosen.categoryId) {
      const category = state.categories.find((item) => item.id === chosen.categoryId);
      if (!category) {
        return;
      }
      const nextCategory = state.categories.find((item) => item.id === chosen.categoryId);
      if (nextCategory) {
        openQuestionModal(nextCategory);
      }
      return;
    }

    if (chosen.kind === 'gift') {
      openGiftModal('gift');
      return;
    }

    if (chosen.kind === 'punishment') {
      openGiftModal('punishment');
      return;
    }

    if (chosen.kind === 'extraTurn') {
      openNoticeModal('Bạn được thêm 1 lượt!');
      return;
    }

    openNoticeModal('Mất lượt!');
  }, DEFAULTS.spinDurationMs);
}

export async function bootstrap(): Promise<void> {
  const loaded = await loadState();
  state = normalizeState(loaded ?? createSampleState());
  runtime.selectedCategoryId = state.categories[0]?.id ?? null;
  ensureQuestionDraft(currentCategory());
  await setupUI();
  render();
  storageReady();

  void App.addListener('pause', () => {
    stopTimer();
  });

  void App.addListener('resume', () => {
    if (runtime.modal && runtime.modal.kind === 'question' && !runtime.modal.paused && !runtime.modal.revealed) {
      startQuestionTimer();
    }
  });
}
