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

export type SettingsSection = 'timer' | 'sound' | 'gifts' | 'punishments' | 'danger';

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
};

export type AppState = {
  categories: Category[];
  settings: Settings;
  answerHistory: AnswerRecord[];
};

export type SpinKind = 'category' | 'gift' | 'punishment' | 'extraTurn' | 'loseTurn';

export type WheelSegment = {
  id: string;
  label: string;
  kind: SpinKind;
  color: string;
  categoryId?: string;
};

export type AnswerRecord = {
  questionId: string;
  playerAnswer: string;
  isCorrect: boolean;
  timeSpentMs?: number;
  submittedAt: string;
};

export type ActiveModal =
  | {
      kind: 'question';
      categoryId: string;
      questionId: string;
      timer: number;
      paused: boolean;
      revealed: boolean;
      remaining: number;
      selectedAnswer: string | null;
      playerAnswer: string | null;
      submitted: boolean;
    }
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
