import { DEFAULT_SOUND_FILES, SOUND_EVENT_KEYS, SUSTAINED_SOUND_EVENTS } from '../config/sounds';
import type { CustomSound, SoundEventKey } from '../types';
import { isNativeApp } from '../utils/platform';
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
};

/** Số bản sao Audio one-shot — cho phép chồng tiếng nhanh trên tablet. */
const ONE_SHOT_POOL_SIZE = 2;

type OneShotPool = {
  elements: HTMLAudioElement[];
  sourceKey: string;
  cursor: number;
};

type SustainedPlayback = {
  audio: HTMLAudioElement;
  sourceKey: string;
};

/**
 * SoundManager — singleton quản lý toàn bộ âm thanh.
 * Tái sử dụng HTMLAudioElement + AudioContext dùng chung (tối ưu WebView/Capacitor).
 */
export class SoundManager {
  private static instance: SoundManager | null = null;

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  private audioContext: AudioContext | null = null;
  private unlocked = false;
  private oneShotPools = new Map<SoundEventKey, OneShotPool>();
  private sustained = new Map<SoundEventKey, SustainedPlayback>();
  private previewAudio: HTMLAudioElement | null = null;
  private previewStopTimer: ReturnType<typeof setTimeout> | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.installUnlockListeners();
    }
  }

  play(event: SoundEventKey): void {
    if (!this.isEnabled()) {
      return;
    }

    void this.ensureUnlocked();

    if (SUSTAINED_SOUND_EVENTS.has(event)) {
      this.playSustained(event, this.resolveSource(event), false);
      return;
    }

    if (event === 'countdown') {
      this.playCountdownTick(this.resolveSource(event));
      return;
    }

    this.playOneShot(event, () => this.playToneFallback(event));
  }

  /** Phát nền lặp (nhạc nền quay, beep 5s cuối) */
  playLoop(event: SoundEventKey): void {
    if (!this.isEnabled()) {
      return;
    }

    void this.ensureUnlocked();
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

  /** Dừng mọi âm khi app vào nền (Android/Capacitor). */
  pauseAll(): void {
    for (const event of [...this.sustained.keys()]) {
      this.stop(event);
    }
    this.stopCountdown();
    this.stopPreview();
  }

  stopCountdown(): void {
    const pool = this.oneShotPools.get('countdown');
    if (!pool) {
      return;
    }

    for (const audio of pool.elements) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  /** Nghe thử nguồn tùy ý (upload chưa lưu hoặc preview trong Cài đặt) */
  previewSource(source: string, options?: { loop?: boolean; maxDurationMs?: number }): void {
    this.stopPreview();
    if (!source) {
      return;
    }

    void this.ensureUnlocked();

    const loop = options?.loop ?? false;
    const audio = this.createAudioElement(source, { loop, volume: 0.9 });
    this.previewAudio = audio;

    void audio.play().catch(() => this.stopPreview());

    if (loop) {
      const maxDurationMs = options?.maxDurationMs ?? 6000;
      this.previewStopTimer = setTimeout(() => this.stopPreview(), maxDurationMs);
    }
  }

  /** Nghe thử âm thanh đang gán cho event (bỏ qua toggle tắt tiếng toàn app) */
  previewEvent(event: SoundEventKey): void {
    void this.ensureUnlocked();

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

  /**
   * Mở khóa audio sau tương tác người dùng — bắt buộc trên iOS/Android WebView.
   * Gọi tự động lần chạm đầu; có thể gọi thủ công từ intro/spin.
   */
  unlock(): void {
    if (this.unlocked) {
      return;
    }

    this.unlocked = true;
    void this.resumeAudioContext();
    this.warmUpDefaultSounds();
  }

  /** Preload clip mặc định — giảm độ trễ lần phát đầu trên tablet. */
  warmUpDefaultSounds(): void {
    for (const key of SOUND_EVENT_KEYS) {
      const source = this.resolveSource(key);
      if (!source) {
        continue;
      }

      if (SUSTAINED_SOUND_EVENTS.has(key)) {
        continue;
      }

      this.ensureOneShotPool(key, source);
    }
  }

  /** Xóa pool khi đổi binding âm thanh trong Cài đặt */
  invalidatePools(): void {
    this.oneShotPools.clear();
    for (const event of [...this.sustained.keys()]) {
      this.stop(event);
    }
  }

  private installUnlockListeners(): void {
    const unlockOnce = (): void => {
      this.unlock();
    };

    window.addEventListener('pointerdown', unlockOnce, { once: true, passive: true });
    window.addEventListener('touchstart', unlockOnce, { once: true, passive: true });
    window.addEventListener('keydown', unlockOnce, { once: true });
  }

  private async ensureUnlocked(): Promise<void> {
    if (!this.unlocked) {
      this.unlock();
    }
    await this.resumeAudioContext();
  }

  private getAudioContext(): AudioContext | null {
    if (this.audioContext) {
      return this.audioContext;
    }

    const AudioContextClass =
      window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }

    this.audioContext = new AudioContextClass();
    return this.audioContext;
  }

  private async resumeAudioContext(): Promise<void> {
    const context = this.getAudioContext();
    if (!context || context.state !== 'suspended') {
      return;
    }

    try {
      await context.resume();
    } catch {
      // WebView có thể từ chối resume nếu chưa có gesture — bỏ qua.
    }
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
    const raw = custom?.dataUrl ?? DEFAULT_SOUND_FILES[event];
    return raw ? this.normalizeAssetUrl(raw) : undefined;
  }

  /** Chuẩn hóa đường dẫn asset cho Capacitor WebView. */
  private normalizeAssetUrl(source: string): string {
    if (source.startsWith('data:') || source.startsWith('blob:') || /^https?:\/\//i.test(source)) {
      return source;
    }

    if (isNativeApp() && source.startsWith('/')) {
      const origin = window.location.origin;
      if (origin && origin !== 'null') {
        return `${origin}${source}`;
      }
    }

    return source;
  }

  private createAudioElement(source: string, options?: { loop?: boolean; volume?: number }): HTMLAudioElement {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = source;
    audio.volume = options?.volume ?? 0.9;
    audio.loop = options?.loop ?? false;
    if (isNativeApp()) {
      audio.setAttribute('playsinline', 'true');
    }
    return audio;
  }

  private ensureOneShotPool(event: SoundEventKey, sourceKey: string): OneShotPool {
    const existing = this.oneShotPools.get(event);
    if (existing && existing.sourceKey === sourceKey) {
      return existing;
    }

    const elements = Array.from({ length: ONE_SHOT_POOL_SIZE }, () =>
      this.createAudioElement(sourceKey, { volume: 0.9 }),
    );
    const pool: OneShotPool = { elements, sourceKey, cursor: 0 };
    this.oneShotPools.set(event, pool);
    return pool;
  }

  private borrowOneShotAudio(event: SoundEventKey, source: string): HTMLAudioElement {
    const pool = this.ensureOneShotPool(event, source);
    const audio = pool.elements[pool.cursor % pool.elements.length];
    pool.cursor += 1;
    return audio;
  }

  private playOneShot(event: SoundEventKey, onFail: () => void): void {
    const source = this.resolveSource(event);
    if (!source) {
      onFail();
      return;
    }

    const audio = this.borrowOneShotAudio(event, source);
    audio.pause();
    audio.currentTime = 0;
    void audio.play().catch(onFail);
  }

  private playSustained(event: SoundEventKey, source: string | undefined, loop: boolean): void {
    if (!source) {
      this.playToneFallback(event);
      return;
    }

    const volume = event === 'introBed' ? 0.82 : 0.9;
    const existing = this.sustained.get(event);

    if (existing && existing.sourceKey === source) {
      existing.audio.loop = loop;
      existing.audio.volume = volume;
      if (existing.audio.paused) {
        void existing.audio.play().catch(() => {
          this.stop(event);
          this.playToneFallback(event);
        });
      }
      return;
    }

    this.stop(event);

    const audio = this.createAudioElement(source, { loop, volume });
    this.sustained.set(event, { audio, sourceKey: source });
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

    const audio = this.borrowOneShotAudio('countdown', source);
    audio.pause();
    audio.currentTime = 0;
    void audio.play().catch(() => this.playToneFallback('countdown'));
  }

  private playToneFallback(event: SoundEventKey): void {
    const fallback = TONE_FALLBACK[event];
    if (fallback) {
      void this.playTone(fallback.frequency, fallback.duration, fallback.type);
    }
  }

  private async playTone(frequency: number, duration: number, type: OscillatorType = 'sine'): Promise<void> {
    await this.ensureUnlocked();
    const context = this.getAudioContext();
    if (!context) {
      return;
    }

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
    oscillator.start(now);
    oscillator.stop(now + duration / 1000);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
}

export const soundManager = SoundManager.getInstance();
