import { markIntroSeen } from '../../storage';
import { appContext } from '../state';
import { soundManager } from '../sound-manager';
import { stopQuestionTimer } from '../question-timer';
import { closeModal } from './modal-actions';

/** Mở lại màn Intro từ header */
export function showIntro(): void {
  stopQuestionTimer();
  closeModal();
  appContext.setRuntimeState({ showIntro: true });
}



/** Hoàn tất intro — dừng nhạc, vào app chính, lưu hasSeenIntro */

export async function completeIntro(): Promise<void> {

  soundManager.stop('introBed');

  await markIntroSeen();

  appContext.setRuntimeState({ showIntro: false });

}

