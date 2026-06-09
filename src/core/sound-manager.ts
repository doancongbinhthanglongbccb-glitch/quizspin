import { DEFAULT_SOUND_FILES, SUSTAINED_SOUND_EVENTS } from '../config/sounds';
import type { CustomSound, SoundEventKey } from '../types';
import { appContext } from './state';

type SoundSpec = {
  frequency: number;
  duration: number;
  type: OscillatorType;
};

const TONE_FALLBACK: Partial<Record<SoundEventKey, SoundSpec>> = {
  introBed: { frequency: 140, duration: 320, type: 'sine' },
  spinBed: { frequency: 140, duration: 320, type: 'sine' },
  spinStart: { frequency: 160, duration: 260, type: 'sawtooth' },
  spinStop: { frequency: 320, duration: 180, type: 'triangle' },
  correct: { frequency: 880, duration: 180, type: 'sine' },
  wrong: { frequency: 220, duration: 260, type: 'sawtooth' },
  countdown: { frequency: 640, duration: 35, type: 'square' },
  fanfare: { frequency: 1040, duration: 320, type: 'sine' },
  gift: { frequency: 880, duration: 280, type: 'sine' },
  punishment: { frequency: 180, duration: 220, type: 'sawtooth' },
  extraTurn: { frequency: 720, duration: 240, type: 'triangle' },
  loseTurn: { frequency: 220, duration: 260, type: 'sawtooth' },
};

type SustainedPlayback = {
  audio: HTMLAudioElement;
};

export class SoundManager {
  private sustained = new Map<SoundEventKey, SustainedPlayback>();
  private pooled = new Map<SoundEventKey, HTMLAudioElement>();
  private previewAudio: HTMLAudioElement | null = null;
  private previewStopTimer: ReturnType<typeof setTimeout> | null = null;

  play(event: SoundEventKey): void {
    if (!this.isEnabled()) {
      return;
    }

    const source = this.resolveSource(event);
    if (SUSTAINED_SOUND_EVENTS.has(event)) {
      this.playSustained(event, source, false);
      return;
    }

    if (event === 'countdown') {
      this.playCountdownTick(source);
      return;
    }

    this.playFresh(source, () => this.playToneFallback(event));
  }

  /** Phát nền lặp (nhạc nền quay, beep 5s cuối) */
  playLoop(event: SoundEventKey): void {
    if (!this.isEnabled()) {
      return;
    }

    this.playSustained(event, this.resolveSource(event), true);
  }

  stop(event: SoundEventKey): void {
    const playback = this.sustained.get(event);
    if (!playback) {
      return;
    }

    playback.audio.pause();
    playback.audio.currentTime = 0;
    playback.audio.loop = false;
    this.sustained.delete(event);
  }

  stopSpinSounds(): void {
    this.stop('spinBed');
    this.stop('spinStart');
  }

  stopIntroMusic(): void {
    this.stop('introBed');
  }

  stopCountdown(): void {
    const audio = this.pooled.get('countdown');
    if (!audio) {
      return;
    }

    audio.pause();
    audio.currentTime = 0;
  }

  /** Nghe thử nguồn tùy ý (upload chưa lưu hoặc preview trong Cài đặt) */
  previewSource(source: string, options?: { loop?: boolean; maxDurationMs?: number }): void {
    this.stopPreview();
    if (!source) {
      return;
    }

    const loop = options?.loop ?? false;
    const audio = new Audio(source);
    audio.volume = 0.9;
    audio.loop = loop;
    this.previewAudio = audio;

    void audio.play().catch(() => this.stopPreview());

    if (loop) {
      const maxDurationMs = options?.maxDurationMs ?? 6000;
      this.previewStopTimer = setTimeout(() => this.stopPreview(), maxDurationMs);
    }
  }

  /** Nghe thử âm thanh đang gán cho event (bỏ qua toggle tắt tiếng toàn app) */
  previewEvent(event: SoundEventKey): void {
    const source = this.resolveSource(event);
    if (SUSTAINED_SOUND_EVENTS.has(event)) {
      this.previewSource(source ?? '', { loop: true, maxDurationMs: 5000 });
      if (!source) {
        this.playToneFallback(event);
      }
      return;
    }

    if (source) {
      this.previewSource(source);
      return;
    }

    this.playToneFallback(event);
  }

  /** Nghe thử bản nháp upload (data URL) */
  previewDraft(dataUrl: string, event: SoundEventKey): void {
    const loop = SUSTAINED_SOUND_EVENTS.has(event);
    this.previewSource(dataUrl, { loop, maxDurationMs: loop ? 5000 : undefined });
  }

  stopPreview(): void {
    if (this.previewStopTimer) {
      clearTimeout(this.previewStopTimer);
      this.previewStopTimer = null;
    }

    if (!this.previewAudio) {
      return;
    }

    this.previewAudio.pause();
    this.previewAudio.currentTime = 0;
    this.previewAudio.loop = false;
    this.previewAudio = null;
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

  private isEnabled(): boolean {
    return appContext.getAppState().settings.sound;
  }

  private resolveSource(event: SoundEventKey): string | undefined {
    const appState = appContext.getAppState();
    const custom = this.resolveCustomSound(
      event,
      appState.settings.sounds?.library ?? [],
      appState.settings.sounds?.bindings,
    );
    return custom?.dataUrl ?? DEFAULT_SOUND_FILES[event];
  }

  private playSustained(event: SoundEventKey, source: string | undefined, loop: boolean): void {
    if (!source) {
      this.playToneFallback(event);
      return;
    }

    this.stop(event);

    const audio = new Audio(source);
    audio.volume = event === 'introBed' ? 0.82 : 0.9;
    audio.loop = loop;
    this.sustained.set(event, { audio });
    void audio.play().catch(() => {
      this.stop(event);
      this.playToneFallback(event);
    });
  }

  /** Một tick mỗi giây — luôn restart clip (file tick có thể dài hơn 1s). */
  private playCountdownTick(source: string | undefined): void {
    if (!source) {
      this.playToneFallback('countdown');
      return;
    }

    let audio = this.pooled.get('countdown');
    if (!audio) {
      audio = new Audio(source);
      audio.volume = 0.9;
      this.pooled.set('countdown', audio);
    }

    audio.pause();
    audio.currentTime = 0;
    void audio.play().catch(() => this.playToneFallback('countdown'));
  }

  private playFresh(source: string | undefined, onFail: () => void): void {
    if (!source) {
      onFail();
      return;
    }

    const audio = new Audio(source);
    audio.volume = 0.9;
    void audio.play().catch(onFail);
  }

  private playToneFallback(event: SoundEventKey): void {
    const fallback = TONE_FALLBACK[event];
    if (fallback) {
      this.playTone(fallback.frequency, fallback.duration, fallback.type);
    }
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
