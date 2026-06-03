export type Question = {
  id: string;
  question: string;
  options: string[];
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

export type Settings = {
  timer: number;
  sound: boolean;
  gifts: RewardItem[];
  punishments: PunishmentItem[];
};

export type AppState = {
  categories: Category[];
  settings: Settings;
};

export type SpinKind = 'category' | 'gift' | 'punishment' | 'extraTurn' | 'loseTurn';

export type WheelSegment = {
  id: string;
  label: string;
  kind: SpinKind;
  color: string;
  categoryId?: string;
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

export type ImportResult = {
  questions: Question[];
  diagnostics: ImportDiagnostic[];
};
