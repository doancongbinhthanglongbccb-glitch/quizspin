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

export type SettingsSection = 'timer' | 'pools' | 'sound' | 'gifts' | 'punishments' | 'intro' | 'danger';

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
  | 'punishment'
  | 'extraTurn'
  | 'loseTurn';

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
};

export type AppState = {
  categories: Category[];
  settings: Settings;
};

export type SpinKind = 'category' | 'gift' | 'punishment' | 'practice';

export type QuizSessionPhase = 'active' | 'result';

export type QuizQuestionResult = {
  questionId: string;
  playerAnswer: string;
  isCorrect: boolean;
};

/** Phiên thi bộ (tối đa 20 câu) */
export type QuizSession = {
  phase: QuizSessionPhase;
  /** `null` = thi thử (mọi lĩnh vực) */
  categoryId: string | null;
  categoryName: string;
  categoryColor: string;
  questionIds: string[];
  currentIndex: number;
  answers: Record<string, string>;
  timerSec: number;
  deadlineAt: number;
  paused: boolean;
  remaining: number;
  results?: QuizQuestionResult[];
  correctCount?: number;
  totalGradable?: number;
  earnedPoints?: number;
  maxPoints?: number;
};

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
  | { kind: 'clear-all-data'; step: 1 | 2 }
  | { kind: 'reset-all-pools' }
  | { kind: 'reset-category-pool'; categoryId: string; categoryName: string }
  | { kind: 'submit-quiz' }
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
