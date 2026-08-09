import type { AppState, ActiveModal, ConfirmDialog, CustomSound, ImportStats, IntroLinkSettings, MatchExamPack, MatchPlayState, MatchSession, QuestionDraft, QuestionPools, SettingsSection, SoundEventKey } from '../types';
import {
  createSampleState,
  defaultQuestionDraft,
  migrateCategoryQuestions,
  normalizeIntroLinks,
} from '../data';
import { DEFAULT_PALETTE, DEFAULTS } from '../config';
import { normalizeMatchSettings } from '../config/match';
import { SOUND_EVENT_KEYS } from '../config/sounds';

/**
 * RuntimeState: Trạng thái UI runtime (không persist)
 * Ví dụ: tab đang chọn, rotation của wheel, form draft, modal hiện tại
 */
export type SoundUploadDraft = {
  eventKey: SoundEventKey;
  name: string;
  mimeType: string;
  dataUrl: string;
};

/** Bản nháp form Cài đặt — cập nhật khi gõ, không re-render */
export type SettingsDraft = {
  gifts?: string;
  punishments?: string;
  introLinks?: IntroLinkSettings[];
};

export type RuntimeState = {
  tab: 'spin' | 'bank' | 'settings';
  rotation: number; // độ quay của wheel
  spinning: boolean;
  toast: string;
  modal: ActiveModal;
  selectedCategoryId: string | null;
  editingQuestionId: string | null;
  /** Form thêm/sửa câu hỏi đang mở */
  bankFormOpen: boolean;
  questionDraft: QuestionDraft;
  questionFilter: 'all' | 'mcq' | 'essay';
  usedGifts: Set<string>;
  usedPunishments: Set<string>;
  /** Ván 3 lượt từ tab Vòng quay — không persist */
  matchSession: MatchSession | null;
  importReport: {
    imported: number;
    skipped: number;
    stats: ImportStats;
    diagnostics: Array<{ rowNumber: number; reason: string; rawData: string[] }>;
  } | null;
  confirmDialog: ConfirmDialog | null;
  settingsSection: SettingsSection;
  settingsDraft: SettingsDraft | null;
  /** File âm thanh đang chờ xác nhận lưu (preview trước khi gán) */
  soundUploadDraft: SoundUploadDraft | null;
  /** Hiển thị màn intro trước khi vào app chính */
  showIntro: boolean;
};

// Tạo state runtime mặc định
export function createDefaultRuntimeState(): RuntimeState {
  return {
    tab: 'spin',
    rotation: 0,
    spinning: false,
    toast: '',
    modal: null,
    selectedCategoryId: null,
    editingQuestionId: null,
    bankFormOpen: false,
    questionDraft: defaultQuestionDraft('mcq'),
    questionFilter: 'all',
    usedGifts: new Set(),
    usedPunishments: new Set(),
    matchSession: null,
    importReport: null,
    confirmDialog: null,
    settingsSection: 'timer',
    settingsDraft: null,
    soundUploadDraft: null,
    showIntro: true,
  };
}

function cloneSettingsDraft(draft: SettingsDraft | null): SettingsDraft | null {
  if (!draft) {
    return null;
  }
  return {
    ...draft,
    introLinks: draft.introLinks?.map((item) => ({ ...item })),
  };
}

function cloneMatchPlayState(play: MatchPlayState): MatchPlayState {
  return {
    ...play,
    questionIds: [...play.questionIds],
  };
}

function cloneMatchSession(session: MatchSession | null): MatchSession | null {
  if (!session) {
    return null;
  }

  return {
    currentRound: session.currentRound,
    scores: { ...session.scores },
    usedQuestionIds: [...session.usedQuestionIds],
    round2Packs: session.round2Packs.map(
      (pack): MatchExamPack => ({
        ...pack,
        questionIds: [...pack.questionIds],
      }),
    ),
    activePlay: session.activePlay ? cloneMatchPlayState(session.activePlay) : null,
    roundSummary: session.roundSummary ? { ...session.roundSummary } : null,
  };
}

function cloneRuntimeState(runtimeState: RuntimeState): RuntimeState {
  return {
    ...runtimeState,
    settingsDraft: cloneSettingsDraft(runtimeState.settingsDraft),
    questionDraft: { ...runtimeState.questionDraft },
    usedGifts: new Set(runtimeState.usedGifts),
    usedPunishments: new Set(runtimeState.usedPunishments),
    matchSession: cloneMatchSession(runtimeState.matchSession),
    importReport: runtimeState.importReport
      ? {
          ...runtimeState.importReport,
          diagnostics: runtimeState.importReport.diagnostics.map((item) => ({ ...item, rawData: [...item.rawData] })),
        }
      : null,
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
    usedGifts: update.usedGifts ? new Set(update.usedGifts) : new Set(current.usedGifts),
    usedPunishments: update.usedPunishments ? new Set(update.usedPunishments) : new Set(current.usedPunishments),
    matchSession: Object.prototype.hasOwnProperty.call(update, 'matchSession')
      ? cloneMatchSession(update.matchSession ?? null)
      : cloneMatchSession(current.matchSession),
    importReport: Object.prototype.hasOwnProperty.call(update, 'importReport')
      ? cloneImportReport(update.importReport ?? null)
      : cloneImportReport(current.importReport),
    confirmDialog: Object.prototype.hasOwnProperty.call(update, 'confirmDialog')
      ? (update.confirmDialog ?? null)
      : current.confirmDialog,
    settingsDraft: Object.prototype.hasOwnProperty.call(update, 'settingsDraft')
      ? cloneSettingsDraft(update.settingsDraft ?? null)
      : cloneSettingsDraft(current.settingsDraft),
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

  for (const key of SOUND_EVENT_KEYS) {
    const value = (bindings as Record<string, unknown>)[key];
    if (typeof value === 'string' && libraryIds.has(value)) {
      next[key] = value;
    }
  }

  return next;
}

function migrateQuestionPools(raw: unknown): QuestionPools {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const next: QuestionPools = {};
  for (const [categoryId, ids] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(ids)) {
      continue;
    }
    const cleaned = ids.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    if (cleaned.length > 0) {
      next[categoryId] = cleaned;
    }
  }
  return next;
}

function normalizeAppState(next: AppState): AppState {
  const categories = next.categories.map((category, index) => ({
    ...category,
    color: category.color || DEFAULT_PALETTE[index % DEFAULT_PALETTE.length],
    questions: migrateCategoryQuestions(category.id, category.questions as unknown[]),
  }));

  const soundLibrary = migrateSoundLibrary(next.settings.sounds?.library);

  const settingsWithLegacy = next.settings as typeof next.settings & { introLink?: IntroLinkSettings };
  const introLinks = normalizeIntroLinks(
    settingsWithLegacy.introLinks,
    settingsWithLegacy.introLink,
  );

  const timer = Math.min(DEFAULTS.timerMaxSec, Math.max(DEFAULTS.timerMinSec, next.settings.timer));

  return {
    settings: {
      timer,
      sound: next.settings.sound,
      gifts: next.settings.gifts,
      punishments: next.settings.punishments,
      sounds: {
        bindings: migrateSoundBindings(next.settings.sounds?.bindings, soundLibrary),
        library: soundLibrary,
      },
      introLinks,
      match: normalizeMatchSettings(next.settings.match, timer),
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
  private questionPools: QuestionPools = {};
  private renderSubscribers: (() => void)[] = [];
  private persistSubscribers: (() => void)[] = [];
  private poolsPersistSubscribers: (() => void)[] = [];

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

  getQuestionPools(): QuestionPools {
    return { ...this.questionPools };
  }

  setQuestionPools(update: QuestionPools | ((current: QuestionPools) => QuestionPools)): void {
    const nextState = typeof update === 'function' ? update({ ...this.questionPools }) : update;
    this.questionPools = migrateQuestionPools(nextState);
    this.notifyPoolsPersistSubscribers();
  }

  subscribePoolsPersist(callback: () => void): () => void {
    this.poolsPersistSubscribers.push(callback);
    return () => {
      this.poolsPersistSubscribers = this.poolsPersistSubscribers.filter((cb) => cb !== callback);
    };
  }

  private notifyPoolsPersistSubscribers(): void {
    for (const callback of this.poolsPersistSubscribers) {
      callback();
    }
  }

  /**
   * Cập nhật AppState với immutable merge
   */
  setAppState(update: AppState | ((current: AppState) => AppState)): void {
    const nextState = typeof update === 'function' ? update(this.appState) : update;
    this.appState = normalizeAppState(nextState);
    this.notifyRenderSubscribers();
    this.notifyPersistSubscribers();
  }

  /** Lưu AppState + persist mà không re-render (dùng khi flush form Cài đặt) */
  setAppStateWithoutRender(update: AppState | ((current: AppState) => AppState)): void {
    const nextState = typeof update === 'function' ? update(this.appState) : update;
    this.appState = normalizeAppState(nextState);
    this.notifyPersistSubscribers();
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
    this.notifyRenderSubscribers();
  }

  /**
   * Cập nhật RuntimeState mà không re-render (dùng khi gõ text trong form)
   */
  patchRuntimeState(update: Partial<RuntimeState>): void {
    this.runtimeState = mergeRuntimeState(this.runtimeState, update);
  }

  /** Cập nhật RuntimeState mà không re-render */
  patchRuntimeStateWithoutRender(update: Partial<RuntimeState>): void {
    this.runtimeState = mergeRuntimeState(this.runtimeState, update);
  }

  /**
   * Đăng ký callback re-render (AppState hoặc RuntimeState thay đổi)
   */
  subscribe(callback: () => void): () => void {
    this.renderSubscribers.push(callback);
    return () => {
      this.renderSubscribers = this.renderSubscribers.filter((cb) => cb !== callback);
    };
  }

  /**
   * Đăng ký callback persist — chỉ khi AppState thay đổi
   */
  subscribePersist(callback: () => void): () => void {
    this.persistSubscribers.push(callback);
    return () => {
      this.persistSubscribers = this.persistSubscribers.filter((cb) => cb !== callback);
    };
  }

  private notifyRenderSubscribers(): void {
    for (const callback of this.renderSubscribers) {
      callback();
    }
  }

  private notifyPersistSubscribers(): void {
    for (const callback of this.persistSubscribers) {
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

  async loadQuestionPools(loader: () => Promise<QuestionPools>): Promise<void> {
    this.questionPools = migrateQuestionPools(await loader());
  }

  async persistQuestionPools(saver: (pools: QuestionPools) => Promise<void>): Promise<void> {
    await saver(this.questionPools);
  }

  /**
   * Persist AppState (dùng trong actions)
   */
  async persistAppState(saver: (key: string, value: AppState) => Promise<void>): Promise<void> {
    await saver('appState', this.appState);
  }
}

export type { AppState } from '../types';

// Export singleton instance theo context pattern
export const appContext = new AppContext();
