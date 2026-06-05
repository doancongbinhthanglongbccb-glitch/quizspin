import type { SoundEventKey } from '../types';

/** Âm thanh mặc định ship trong `public/sounds/` */
export const DEFAULT_SOUND_FILES: Record<SoundEventKey, string> = {
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
export const SUSTAINED_SOUND_EVENTS = new Set<SoundEventKey>(['spinBed', 'spinStart']);
