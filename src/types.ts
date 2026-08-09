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

export type QuestionFilter = 'all' | QuestionType;

export type SettingsSection = 'timer' | 'match' | 'pools' | 'sound' | 'gifts' | 'punishments' | 'intro' | 'danger';

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

export type RewardItem = {
  id: string;
  text: string;
};

export type PunishmentItem = {
  id: string;
  text: string;
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
  | 'countdown'
  | 'correct'
  | 'wrong'
  | 'fanfare'
  | 'gift'
  | 'punishment';

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
  gifts: RewardItem[];
  punishments: PunishmentItem[];
  sounds?: SoundSettings;
  introLinks: IntroLinkSettings[];
  /** Cấu hình ván 3 lượt — optional để migrate mềm bản cũ */
  match?: MatchSettings;
};

/** Gói điểm Lượt 3 — cấu hình trong Settings */
export type MatchScorePackage = {
  id: string;
  points: number;
  timerSec: number;
};

/** Cấu hình ván 3 lượt (persist trong Settings) */
export type MatchSettings = {
  round1QuestionCount: number;
  round1TimerSec: number;
  /** Số câu mỗi bộ đề Lượt 2 */
  round2QuestionsPerPack: number;
  round2TimerSec: number;
  round3QuestionCount: number;
  round3Packages: MatchScorePackage[];
  /** id trong round3Packages; thiếu/invalid → phần tử đầu */
  round3DefaultPackageId: string;
};

export type MatchRoundId = 1 | 2 | 3;

/** Bộ đề Lượt 2 — tạo lúc bắt đầu ván, không phải CategoryExam */
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
  phase: 'picking-package' | 'prompt' | 'answering' | 'revealed';
  /** Điểm mỗi câu đúng — L1/L2; L3 dùng gói */
  pointsPerQuestion: number;
  /** Nhãn hiển thị (lĩnh vực / Đề số n / Lượt 3) */
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
  /** null = chưa chọn / chưa vào phần thi lượt */
  activePlay: MatchPlayState | null;
  /** Sau hết lượt — màn tóm tắt chờ MC bấm Tiếp tục */
  roundSummary: { round: MatchRoundId; score: number } | null;
};

export type AppState = {
  categories: Category[];
  settings: Settings;
};

/** `gift`/`punishment` giữ cho Settings/modal; wheel hiện chỉ dùng `category` */
export type SpinKind = 'category' | 'gift' | 'punishment';

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
  | { kind: 'reset-all-pools' }
  | { kind: 'reset-category-pool'; categoryId: string; categoryName: string }
  | { kind: 'add-category' }
  | { kind: 'rename-category'; categoryId: string; categoryName: string }
  | { kind: 'category-menu'; categoryId: string; categoryName: string };

export type ActiveModal =
  | {
      kind: 'gift';
      title: string;
      text: string;
    }
  | {
      kind: 'notice';
      text: string;
    }
  | null;

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
