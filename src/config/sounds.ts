import type { SoundEventKey } from '../types';

export const SOUND_EVENT_KEYS: SoundEventKey[] = [
  'introBed',
  'spinBed',
  'spinStart',
  'spinStop',
  'quizBed',
  'countdown',
  'correct',
  'wrong',
  'fanfare',
  'tadaSummary',
];

/** Âm thanh mặc định ship trong `public/sounds/` */
export const DEFAULT_SOUND_FILES: Record<SoundEventKey, string> = {
  introBed: '/sounds/nhac-nen-doan-cong-binh.mp3',
  spinBed: '/sounds/nhac-xo-so.mp3',
  spinStart: '/sounds/spinning-wheel.mp3',
  spinStop: '/sounds/transition-whoosh.mp3',
  quizBed: '/sounds/nhac-nen-cau-hoi.mp3',
  countdown: '/sounds/clock-ticking-js.mp3',
  correct: '/sounds/correct.mp3',
  wrong: '/sounds/wrong-answer-buzzer.mp3',
  fanfare: '/sounds/tada-qua.mp3',
  tadaSummary: '/sounds/tada.swf.mp3',
};

export const DEFAULT_SOUND_FILE_NAMES: Record<SoundEventKey, string> = {
  introBed: 'nhac-nen-doan-cong-binh.mp3',
  spinBed: 'nhac-xo-so.mp3',
  spinStart: 'spinning-wheel.mp3',
  spinStop: 'transition-whoosh.mp3',
  quizBed: 'nhac-nen-cau-hoi.mp3',
  countdown: 'clock-ticking-js.mp3',
  correct: 'correct.mp3',
  wrong: 'wrong-answer-buzzer.mp3',
  fanfare: 'tada-qua.mp3',
  tadaSummary: 'tada.swf.mp3',
};

/** Phát nền — cần `soundManager.stop()` để dừng */
export const SUSTAINED_SOUND_EVENTS = new Set<SoundEventKey>([
  'introBed',
  'spinBed',
  'spinStart',
  'quizBed',
  'countdown',
]);

/** Nhóm hiển thị trong Tab Cài đặt */
export const SOUND_EVENT_GROUPS: Array<{ title: string; keys: SoundEventKey[] }> = [
  { title: 'Màn hình chào', keys: ['introBed'] },
  { title: 'Vòng quay', keys: ['spinBed', 'spinStart', 'spinStop'] },
  { title: 'Câu hỏi', keys: ['quizBed', 'countdown', 'correct', 'wrong'] },
  { title: 'Tổng kết ván', keys: ['fanfare', 'tadaSummary'] },
];
