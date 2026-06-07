import type { SoundEventKey } from '../types';

/** Đoạn nhạc intro lặp (giây) — tối ưu thời lượng, không phát full ~3.7 phút */
const INTRO_BED_CLIP = {
  startSec: 0,
  durationSec: 26,
  volume: 0.82,
} as const;

export type SoundEventClip = {
  startSec: number;
  durationSec: number;
  volume?: number;
};

export const SOUND_EVENT_CLIPS: Partial<Record<SoundEventKey, SoundEventClip>> = {
  introBed: INTRO_BED_CLIP,
};

export const SOUND_EVENT_KEYS: SoundEventKey[] = [
  'introBed',
  'spinBed',
  'spinStart',
  'spinStop',
  'countdown',
  'correct',
  'wrong',
  'fanfare',
  'gift',
  'punishment',
  'extraTurn',
  'loseTurn',
];

/** Âm thanh mặc định ship trong `public/sounds/` */
export const DEFAULT_SOUND_FILES: Record<SoundEventKey, string> = {
  introBed: '/sounds/nhac-nen-doan-cong-binh.mp3',
  spinBed: '/sounds/nhac-xo-so.mp3',
  spinStart: '/sounds/spinning-wheel.mp3',
  spinStop: '/sounds/transition-whoosh.mp3',
  countdown: '/sounds/clock-ticking-js.mp3',
  correct: '/sounds/correct.mp3',
  wrong: '/sounds/wrong-answer-buzzer.mp3',
  fanfare: '/sounds/tada-qua.mp3',
  gift: '/sounds/tada-qua.mp3',
  punishment: '/sounds/punch-sound-effect.mp3',
  extraTurn: '/sounds/tieng-vo-tay.mp3',
  loseTurn: '/sounds/wrong-answer-buzzer.mp3',
};

export const DEFAULT_SOUND_FILE_NAMES: Record<SoundEventKey, string> = {
  introBed: 'nhac-nen-doan-cong-binh.mp3',
  spinBed: 'nhac-xo-so.mp3',
  spinStart: 'spinning-wheel.mp3',
  spinStop: 'transition-whoosh.mp3',
  countdown: 'clock-ticking-js.mp3',
  correct: 'correct.mp3',
  wrong: 'wrong-answer-buzzer.mp3',
  fanfare: 'tada-qua.mp3',
  gift: 'tada-qua.mp3',
  punishment: 'punch-sound-effect.mp3',
  extraTurn: 'tieng-vo-tay.mp3',
  loseTurn: 'wrong-answer-buzzer.mp3',
};

/** Phát nền — cần `soundManager.stop()` để dừng */
export const SUSTAINED_SOUND_EVENTS = new Set<SoundEventKey>(['introBed', 'spinBed', 'spinStart']);

/** Nhóm hiển thị trong Tab Cài đặt */
export const SOUND_EVENT_GROUPS: Array<{ title: string; keys: SoundEventKey[] }> = [
  { title: 'Màn hình chào', keys: ['introBed'] },
  { title: 'Vòng quay', keys: ['spinBed', 'spinStart', 'spinStop'] },
  { title: 'Câu hỏi', keys: ['countdown', 'correct', 'wrong', 'fanfare'] },
  { title: 'Phần thưởng & phạt', keys: ['gift', 'punishment', 'extraTurn', 'loseTurn'] },
];
