import type {
  AppState,
  Category,
  IntroLinkSettings,
  Question,
  Settings,
  SoundEventKey,
  WheelSegment,
} from '../types';
import { DEFAULT_PALETTE, DEFAULT_TIMER_SEC } from '../config';
import { defaultMatchSettings } from '../config/match';
import { normalizeQuestion } from './mcq';
import { uid } from './uid';

function defaultIntroLinks(): IntroLinkSettings[] {
  return [];
}

function defaultSettings(): Settings {
  return {
    timer: DEFAULT_TIMER_SEC,
    sound: true,
    sounds: {
      bindings: {},
      library: [],
    },
    introLinks: defaultIntroLinks(),
    match: defaultMatchSettings(DEFAULT_TIMER_SEC),
  };
}

export function createSampleState(): AppState {
  const historyId = uid();
  const scienceId = uid();

  return {
    settings: defaultSettings(),
    categories: [
      {
        id: historyId,
        name: 'Lịch sử',
        color: DEFAULT_PALETTE[0],
        questions: [
          normalizeQuestion({
            categoryId: historyId,
            type: 'mcq',
            question: 'Việt Nam giành độc lập vào năm nào?',
            options: ['A. 1945', 'B. 1954', 'C. 1975', 'D. 1986'],
            answer: 'A. 1945',
          }),
        ],
      },
      {
        id: scienceId,
        name: 'Khoa học',
        color: DEFAULT_PALETTE[1],
        questions: [
          normalizeQuestion({
            categoryId: scienceId,
            type: 'mcq',
            question: 'Nước sôi ở bao nhiêu độ C ở mực nước biển?',
            options: ['A. 80', 'B. 90', 'C. 100', 'D. 120'],
            answer: 'C. 100',
          }),
        ],
      },
    ],
  };
}

export function makeCategory(name: string): Category {
  return {
    id: uid(),
    name,
    color: DEFAULT_PALETTE[Math.floor(Math.random() * DEFAULT_PALETTE.length)],
    questions: [],
  };
}

export const SOUND_EVENT_LABELS: Record<SoundEventKey, string> = {
  introBed: 'Nhạc nền Intro',
  spinBed: 'Nhạc nền khi quay',
  spinStart: 'Tiếng quay bánh xe',
  spinStop: 'Tiếng dừng quay',
  quizBed: 'Nhạc nền khi trả lời',
  correct: 'Trả lời đúng',
  wrong: 'Trả lời sai',
  countdown: 'Tick đếm giờ (5 giây cuối)',
  fanfare: 'Chúc mừng tổng kết',
  tadaSummary: 'Tổng kết mỗi màn',
};

export function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function findQuestionById(categories: Category[], questionId: string): Question | null {
  for (const category of categories) {
    const found = category.questions.find((item) => item.id === questionId);
    if (found) {
      return found;
    }
  }
  return null;
}

export function buildWheelSegments(categories: Category[]): WheelSegment[] {
  return categories.map(
    (category): WheelSegment => ({
      id: category.id,
      label: category.name,
      kind: 'category',
      color: category.color,
      categoryId: category.id,
    }),
  );
}
