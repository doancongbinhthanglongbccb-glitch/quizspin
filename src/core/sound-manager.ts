import { DEFAULT_SOUND_FILES } from '../config/sounds';
import type { CustomSound, SoundEventKey } from '../types';
import { appContext } from './state';

type SoundSpec = {
  frequency: number;
  duration: number;
  type: OscillatorType;
};

/** Fallback nếu file bundle không load được */
const TONE_FALLBACK: Partial<Record<SoundEventKey, SoundSpec>> = {
  correct: { frequency: 880, duration: 180, type: 'sine' },
  wrong: { frequency: 220, duration: 260, type: 'sawtooth' },
  timeup: { frequency: 880, duration: 450, type: 'triangle' },
  countdown: { frequency: 640, duration: 35, type: 'square' },
  spin: { frequency: 160, duration: 260, type: 'sawtooth' },
  tick: { frequency: 420, duration: 20, type: 'square' },
  click: { frequency: 660, duration: 420, type: 'triangle' },
  fanfare: { frequency: 1040, duration: 320, type: 'sine' },
};

export class SoundManager {
  private activeAudio: HTMLAudioElement | null = null;

  play(event: SoundEventKey): void {
    const appState = appContext.getAppState();
    if (!appState.settings.sound) {
      return;
    }

    const custom = this.resolveCustomSound(
      event,
      appState.settings.sounds?.library ?? [],
      appState.settings.sounds?.bindings,
    );
    if (custom) {
      this.playDataUrl(custom.dataUrl);
      return;
    }

    const bundled = DEFAULT_SOUND_FILES[event];
    if (bundled) {
      this.playUrl(bundled);
      return;
    }

    const fallback = TONE_FALLBACK[event];
    if (fallback) {
      this.playTone(fallback.frequency, fallback.duration, fallback.type);
    }
  }

  resolveCustomSound(
    event: SoundEventKey,
    library: CustomSound[],
    bindings: Partial<Record<SoundEventKey, string>> | undefined,
  ): CustomSound | null {
    const soundId = bindings?.[event];
    if (!soundId) {
      return null;
    }

    return library.find((item) => item.id === soundId) ?? null;
  }

  private playUrl(url: string): void {
    this.activeAudio?.pause();

    const audio = new Audio(url);
    audio.volume = 0.9;
    this.activeAudio = audio;
    void audio.play().catch(() => {
      const eventKey = (Object.keys(DEFAULT_SOUND_FILES) as SoundEventKey[]).find(
        (key) => DEFAULT_SOUND_FILES[key] === url,
      );
      if (eventKey) {
        const fallback = TONE_FALLBACK[eventKey];
        if (fallback) {
          this.playTone(fallback.frequency, fallback.duration, fallback.type);
        }
      }
    });
    audio.onended = () => {
      if (this.activeAudio === audio) {
        this.activeAudio = null;
      }
    };
  }

  private playDataUrl(dataUrl: string): void {
    this.activeAudio?.pause();

    const audio = new Audio(dataUrl);
    audio.volume = 0.9;
    this.activeAudio = audio;
    void audio.play().catch(() => undefined);
    audio.onended = () => {
      if (this.activeAudio === audio) {
        this.activeAudio = null;
      }
    };
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine'): void {
    const AudioContextClass =
      window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.0001;
    oscillator.connect(gain);
    gain.connect(context.destination);

    const now = context.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration / 1000);
    oscillator.start();
    oscillator.stop(now + duration / 1000);
    oscillator.onended = () => context.close().catch(() => undefined);
  }
}

export const soundManager = new SoundManager();
