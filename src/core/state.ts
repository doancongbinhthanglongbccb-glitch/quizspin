import type { AppState, ActiveModal, AnswerRecord, CustomSound, ImportStats, QuestionDraft, SoundEventKey } from '../types';
import { createSampleState, defaultQuestionDraft, migrateCategoryQuestions } from '../data';
import { DEFAULT_PALETTE, DEFAULTS } from '../config';

/**
 * RuntimeState: Trạng thái UI runtime (không persist)
 * Ví dụ: tab đang chọn, rotation của wheel, form draft, modal hiện tại
 */
export type RuntimeState = {
  tab: 'spin' | 'bank' | 'settings';
  rotation: number; // độ quay của wheel
  spinning: boolean;
  toast: string;
  modal: ActiveModal;
  selectedCategoryId: string | null;
  editingQuestionId: string | null;
  questionDraft: QuestionDraft;
  questionFilter: 'all' | 'mcq' | 'essay';
  usedQuestionIds: Set<string>;
  usedGifts: Set<string>;
  usedPunishments: Set<string>;
  importReport: {
    imported: number;
    skipped: number;
    stats: ImportStats;
    diagnostics: Array<{ rowNumber: number; reason: string; rawData: string[] }>;
  } | null;
  bankLogs?: Array<{ ts: number; message: string }>;
  spinHistory: Array<{ label: string; color: string; ts: number }>;
};

// Tạo state runtime mặc định
function createDefaultRuntimeState(): RuntimeState {
  return {
    tab: 'spin',
    rotation: 0,
    spinning: false,
    toast: '',
    modal: null,
    selectedCategoryId: null,
    editingQuestionId: null,
    questionDraft: defaultQuestionDraft('mcq'),
    questionFilter: 'all',
    usedQuestionIds: new Set(),
    usedGifts: new Set(),
    usedPunishments: new Set(),
    importReport: null,
    bankLogs: [],
    spinHistory: [],
  };
}

function cloneRuntimeState(runtimeState: RuntimeState): RuntimeState {
  return {
    ...runtimeState,
    questionDraft: { ...runtimeState.questionDraft },
    usedQuestionIds: new Set(runtimeState.usedQuestionIds),
    usedGifts: new Set(runtimeState.usedGifts),
    usedPunishments: new Set(runtimeState.usedPunishments),
    importReport: runtimeState.importReport
      ? {
          ...runtimeState.importReport,
          diagnostics: runtimeState.importReport.diagnostics.map((item) => ({ ...item, rawData: [...item.rawData] })),
        }
      : null,
    bankLogs: runtimeState.bankLogs ? runtimeState.bankLogs.map((l) => ({ ...l })) : [],
    spinHistory: runtimeState.spinHistory.map((item) => ({ ...item })),
  };
}

function cloneImportReport(importReport: RuntimeState['importReport']): RuntimeState['importReport'] {
  if (!importReport) {
    return null;
  }

  return {
    ...importReport,
    diagnostics: importReport.diagnostics.map((item) => ({
      ...item,
      rawData: [...item.rawData],
    })),
  };
}

function mergeRuntimeState(current: RuntimeState, update: Partial<RuntimeState>): RuntimeState {
  const merged: RuntimeState = {
    ...current,
    ...update,
    questionDraft: update.questionDraft ? { ...update.questionDraft } : { ...current.questionDraft },
    usedQuestionIds: update.usedQuestionIds ? new Set(update.usedQuestionIds) : new Set(current.usedQuestionIds),
    usedGifts: update.usedGifts ? new Set(update.usedGifts) : new Set(current.usedGifts),
    usedPunishments: update.usedPunishments ? new Set(update.usedPunishments) : new Set(current.usedPunishments),
    importReport: Object.prototype.hasOwnProperty.call(update, 'importReport')
      ? cloneImportReport(update.importReport ?? null)
      : cloneImportReport(current.importReport),
    bankLogs: Object.prototype.hasOwnProperty.call(update, 'bankLogs') ? (update.bankLogs ? update.bankLogs.map((l) => ({ ...l })) : []) : (current.bankLogs ? current.bankLogs.map((l) => ({ ...l })) : []),
    spinHistory: update.spinHistory ? update.spinHistory.map((item) => ({ ...item })) : current.spinHistory.map((item) => ({ ...item })),
  };

  return cloneRuntimeState(merged);
}

/**
 * Chuẩn hóa AppState: đảm bảo tính hợp lệ của dữ liệu
 * - Xác thực timer trong phạm vi cho phép
 * - Đảm bảo mỗi category có màu
 * - Xử lý gifts/punishments (FIX: không generate UUID mới!)
 */
function migrateSoundLibrary(items: unknown): CustomSound[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const candidate = item as Partial<CustomSound>;
      const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
      const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
      const dataUrl = typeof candidate.dataUrl === 'string' ? candidate.dataUrl.trim() : '';
      if (!id || !name || !dataUrl.startsWith('data:')) {
        return null;
      }

      return {
        id,
        name,
        mimeType: typeof candidate.mimeType === 'string' ? candidate.mimeType : 'audio/mpeg',
        dataUrl,
      } satisfies CustomSound;
    })
    .filter((item): item is CustomSound => Boolean(item));
}

function migrateSoundBindings(
  bindings: unknown,
  library: CustomSound[],
): Partial<Record<SoundEventKey, string>> {
  if (!bindings || typeof bindings !== 'object') {
    return {};
  }

  const libraryIds = new Set(library.map((item) => item.id));
  const next: Partial<Record<SoundEventKey, string>> = {};
  const allowed: SoundEventKey[] = ['spin', 'tick', 'correct', 'wrong', 'timeup', 'fanfare', 'click'];

  for (const key of allowed) {
    const value = (bindings as Record<string, unknown>)[key];
    if (typeof value === 'string' && libraryIds.has(value)) {
      next[key] = value;
    }
  }

  return next;
}

function migrateAnswerHistory(items: unknown): AnswerRecord[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const record = item as Partial<AnswerRecord>;
      const questionId = typeof record.questionId === 'string' ? record.questionId.trim() : '';
      const playerAnswer = typeof record.playerAnswer === 'string' ? record.playerAnswer : '';
      const submittedAt = typeof record.submittedAt === 'string' ? record.submittedAt : '';
      if (!questionId || !submittedAt) {
        return null;
      }

      return {
        questionId,
        playerAnswer,
        isCorrect: Boolean(record.isCorrect),
        timeSpentMs: typeof record.timeSpentMs === 'number' ? record.timeSpentMs : undefined,
        submittedAt,
      } satisfies AnswerRecord;
    })
    .filter((item): item is AnswerRecord => Boolean(item));
}

function normalizeAppState(next: AppState): AppState {
  const categories = next.categories.map((category, index) => ({
    ...category,
    color: category.color || DEFAULT_PALETTE[index % DEFAULT_PALETTE.length],
    questions: migrateCategoryQuestions(category.id, category.questions as unknown[]),
  }));

  const soundLibrary = migrateSoundLibrary(next.settings.sounds?.library);

  return {
    settings: {
      timer: Math.min(DEFAULTS.timerMaxSec, Math.max(DEFAULTS.timerMinSec, next.settings.timer)),
      sound: next.settings.sound,
      gifts: next.settings.gifts,
      punishments: next.settings.punishments,
      sounds: {
        bindings: migrateSoundBindings(next.settings.sounds?.bindings, soundLibrary),
        library: soundLibrary,
      },
    },
    categories,
    answerHistory: migrateAnswerHistory(next.answerHistory),
  };
}

/**
 * AppContext: Quản lý AppState + RuntimeState
 * Sử dụng EventEmitter pattern để notify subscribers khi state thay đổi
 */
export class AppContext {
  private appState: AppState;
  private runtimeState: RuntimeState;
  private subscribers: (() => void)[] = [];

  constructor() {
    this.appState = createSampleState();
    this.runtimeState = createDefaultRuntimeState();
  }

  /**
   * Lấy AppState hiện tại (persisted state)
   */
  getAppState(): AppState {
    return this.appState;
  }

  /**
   * Cập nhật AppState với immutable merge
   */
  setAppState(update: AppState | ((current: AppState) => AppState)): void {
    const nextState = typeof update === 'function' ? update(this.appState) : update;
    this.appState = normalizeAppState(nextState);
    this.notifySubscribers();
  }

  /**
   * Lấy RuntimeState hiện tại (UI state)
   */
  getRuntimeState(): RuntimeState {
    return this.runtimeState;
  }

  /**
   * Cập nhật RuntimeState (partial merge)
   */
  setRuntimeState(update: Partial<RuntimeState>): void {
    this.runtimeState = mergeRuntimeState(this.runtimeState, update);
    this.notifySubscribers();
  }

  /**
   * Đăng ký callback để được gọi khi state thay đổi
   */
  subscribe(callback: () => void): () => void {
    this.subscribers.push(callback);
    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  /**
   * Thông báo cho tất cả subscribers khi state thay đổi
   */
  private notifySubscribers(): void {
    for (const callback of this.subscribers) {
      callback();
    }
  }

  /**
   * Load state từ storage (dùng trong bootstrap)
   */
  async loadFromStorage(loader: (key: string) => Promise<AppState | null>): Promise<void> {
    const loaded = await loader('appState');
    if (loaded) {
      this.appState = normalizeAppState(loaded);
    }
    this.runtimeState.selectedCategoryId = this.appState.categories[0]?.id ?? null;
  }

  /**
   * Persist AppState (dùng trong actions)
   */
  async persistAppState(saver: (key: string, value: AppState) => Promise<void>): Promise<void> {
    await saver('appState', this.appState);
  }
}

// Export singleton instance theo context pattern
export const appContext = new AppContext();
