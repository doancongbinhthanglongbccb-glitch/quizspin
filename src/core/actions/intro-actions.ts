import { appContext } from '../state';
import { soundManager } from '../sound-manager';
import { closeModal } from './modal-actions';

/** Mở lại màn Intro — render intro + nhạc nền (trong bindIntroHandlers) */
export function showIntro(): void {
  closeModal();
  appContext.setRuntimeState({ showIntro: true });
}

/** Hoàn tất intro — dừng nhạc, vào app chính */
export function completeIntro(): void {
  soundManager.stop('introBed');
  appContext.setRuntimeState({ showIntro: false });
}
