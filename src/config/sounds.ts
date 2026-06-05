import type { SoundEventKey } from '../types';

/** Âm thanh mặc định ship trong `public/sounds/` */
export const DEFAULT_SOUND_FILES: Record<SoundEventKey, string> = {
  correct: '/sounds/correct.mp3',
  wrong: '/sounds/wrong.wav',
  timeup: '/sounds/final-countdown-timer.wav',
  countdown: '/sounds/clock-tick.wav',
  spin: '/sounds/whoosh.mp3',
  tick: '/sounds/clock-tick.wav',
  click: '/sounds/mouse-click.mp3',
  fanfare: '/sounds/correct.mp3',
};

export const DEFAULT_SOUND_FILE_NAMES: Record<SoundEventKey, string> = {
  correct: 'correct.mp3',
  wrong: 'wrong.wav',
  timeup: 'final-countdown-timer.wav',
  countdown: 'clock-tick.wav',
  spin: 'whoosh.mp3',
  tick: 'clock-tick.wav',
  click: 'mouse-click.mp3',
  fanfare: 'correct.mp3',
};
