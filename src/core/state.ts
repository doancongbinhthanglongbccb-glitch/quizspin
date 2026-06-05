import type { AppState, ActiveModal } from '../types';
import { createSampleState } from '../data';
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
  bankLogs?: Array<{ ts: number; message: string }>;
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
    questionDraft: {
      question: '',
      options: '',
      answer: '',
    },
    usedQuestionIds: new Set(),
    usedGifts: new Set(),
    usedPunishments: new Set(),
    importReport: null,
    bankLogs: [],
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
  };

  return cloneRuntimeState(merged);
}

/**
 * Chuẩn hóa AppState: đảm bảo tính hợp lệ của dữ liệu
 * - Xác thực timer trong phạm vi cho phép
 * - Đảm bảo mỗi category có màu
 * - Xử lý gifts/punishments (FIX: không generate UUID mới!)
 */
function normalizeAppState(next: AppState): AppState {
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
      gifts: next.settings.gifts,
      punishments: next.settings.punishments,
    },
    categories,
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
