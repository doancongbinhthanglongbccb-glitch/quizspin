export type QuestionType = 'mcq' | 'essay';

export type Question = {
  id: string;
  categoryId: string;
  type: QuestionType;
  question: string;
  /** MCQ: có dữ liệu; Essay: `[]` hoặc `undefined` */
  options?: string[];
  answer: string;
  /** Mặc định 10 */
  points?: number;
};

export type SettingsSection = 'match' | 'sound' | 'intro' | 'pool' | 'danger';

/** Pool câu đã dùng theo lĩnh vực — persist key `quizspin_pools` */
export type QuestionPools = Record<string, string[]>;

export type IntroLinkSettings = {
  label: string;
  url: string;
};

export const MAX_INTRO_LINKS = 3;

export type QuestionDraft = {
  type: QuestionType;
  question: string;
  options: string;
  answer: string;
};

export type Category = {
  id: string;
  name: string;
  color: string;
  questions: Question[];
};

export type SoundEventKey =
  | 'introBed'
  | 'spinBed'
  | 'spinStart'
  | 'spinStop'
  | 'quizBed'
  | 'countdown'
  | 'correct'
  | 'wrong'
  | 'fanfare';

export type CustomSound = {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
};

export type SoundSettings = {
  bindings: Partial<Record<SoundEventKey, string>>;
  library: CustomSound[];
};

export type Settings = {
  timer: number;
  sound: boolean;
  sounds?: SoundSettings;
  introLinks: IntroLinkSettings[];
  /** Cấu hình ván 3 lượt — optional để migrate mềm bản cũ */
  match?: MatchSettings;
};

/** Gói điểm Về đích — cấu hình trong Settings */
export type MatchScorePackage = {
  id: string;
  points: number;
  timerSec: number;
};

/** Cấu hình ván 3 lượt (persist trong Settings) */
export type MatchSettings = {
  round1QuestionCount: number;
  round1TimerSec: number;
  /** Số câu mỗi bộ đề Tổng hợp */
  round2QuestionsPerPack: number;
  round2TimerSec: number;
  round3QuestionCount: number;
  /** Thời gian mỗi câu Về đích (chạy sau khi chọn gói) */
  round3TimerSec: number;
  round3Packages: MatchScorePackage[];
  /** id trong round3Packages; thiếu/invalid → phần tử đầu — điểm đúng khi ngoài cửa sổ gói */
  round3DefaultPackageId: string;
  /** Giây chờ chọn gói trước khi tự áp gói mặc định */
  round3PackagePickSec: number;
};

export type MatchRoundId = 1 | 2 | 3;

/** Bộ đề Tổng hợp — sinh sau Continue Khởi động */
export type MatchExamPack = {
  id: string;
  index: number;
  title: string;
  questionIds: string[];
};

/**
 * Một lượt thi đang chạy trong match (1 câu/lần).
 * Chi tiết UI/chấm điểm — Phase 2.
 */
export type MatchPlayState = {
  round: MatchRoundId;
  questionIds: string[];
  currentIndex: number;
  /** Điểm đã cộng trong lượt hiện tại */
  roundScore: number;
  /** L3: gói đã chọn cho câu hiện tại; L1/L2: null */
  selectedPackageId: string | null;
  phase: 'picking-package' | 'answering' | 'revealed';
  /** Điểm mỗi câu đúng — L1/L2; L3 dùng gói */
  pointsPerQuestion: number;
  /** Nhãn hiển thị (lĩnh vực / Đề số n / Về đích) */
  label: string;
  accentColor: string;
  timerSec: number;
  deadlineAt: number;
  remaining: number;
  playerAnswer: string;
  /** null = essay đang chờ MC bấm Đúng/Sai */
  lastIsCorrect: boolean | null;
  lastPointsDelta: number;
};

export type MatchRound3SourceMode = 'bank' | 'category';

/**
 * Ván chơi 3 lượt — runtime only (không persist).
 * Tách bạch với spin animation (`rotation` / SpinSession).
 */
export type MatchSession = {
  currentRound: MatchRoundId;
  scores: Record<MatchRoundId, number>;
  /** Câu đã hiện trong ván (đúng/sai đều tính) */
  usedQuestionIds: string[];
  /** Pack L2 đã sinh lúc start; L1/L3 không dùng */
  round2Packs: MatchExamPack[];
  /**
   * L3: số lần còn lại của gói không-mặc-định (đúng trong cửa sổ → trừ 1).
   * Gói mặc định không có trong map.
   */
  round3PackageRemaining: Record<string, number>;
  /** L3: nguồn câu — toàn bank hoặc một lĩnh vực */
  round3SourceMode: MatchRound3SourceMode;
  /** L3: lĩnh vực khi round3SourceMode === 'category' */
  round3CategoryId: string | null;
  /** null = chưa chọn / chưa vào phần thi lượt */
  activePlay: MatchPlayState | null;
  /** Sau hết lượt — màn tóm tắt chờ MC bấm Tiếp tục */
  roundSummary: { round: MatchRoundId; score: number } | null;
  /** Sau Continue tóm tắt L3 — màn tổng kết cả ván */
  showFinalSummary: boolean;
};

export type AppState = {
  categories: Category[];
  settings: Settings;
};

/** Segment bánh xe — category (L1) hoặc ô đề (L2 tái dùng kind này) */
export type SpinKind = 'category';

export type WheelSegment = {
  id: string;
  label: string;
  kind: SpinKind;
  color: string;
  categoryId?: string;
};

export type ConfirmDialog =
  | { kind: 'delete-question'; categoryId: string; questionId: string }
  | { kind: 'delete-category'; categoryId: string; categoryName: string; questionCount: number }
  | { kind: 'clear-category-questions'; categoryId: string; categoryName: string; questionCount: number }
  | { kind: 'import-backup'; categoryCount: number; questionCount: number }
  | { kind: 'clear-all-data'; step: 1 | 2 }
  | { kind: 'clear-used-questions'; usedCount: number }
  | { kind: 'add-category' }
  | { kind: 'rename-category'; categoryId: string; categoryName: string }
  | { kind: 'category-menu'; categoryId: string; categoryName: string };

export type ActiveModal =
  | null
  | {
      kind: 'spin-result';
      /** Tên lĩnh vực / bộ đề vừa trúng */
      label: string;
      color: string;
      /** Nhãn phụ: Khởi động / Tổng hợp / Về đích */
      eyebrow: string;
      round: 1 | 2;
      categoryId?: string;
      packId?: string;
    };

export type ImportDiagnostic = {
  rowNumber: number;
  reason: string;
  rawData: string[];
};

export type ImportStats = {
  total: number;
  mcq: number;
  essay: number;
  skipped: number;
  byCategory: Record<string, { mcq: number; essay: number; total: number }>;
};

export type ImportedQuestionRow = {
  question: Question;
  categoryName: string | null;
};

export type ImportResult = {
  rows: ImportedQuestionRow[];
  questions: Question[];
  stats: ImportStats;
  diagnostics: ImportDiagnostic[];
};
