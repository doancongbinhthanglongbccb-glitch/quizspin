import { markIntroSeen } from '../../storage';

import { appContext } from '../state';

import { soundManager } from '../sound-manager';



/** Mở lại màn Intro từ header */

export function showIntro(): void {

  appContext.setRuntimeState({ showIntro: true });

}



/** Hoàn tất intro — dừng nhạc, vào app chính, lưu hasSeenIntro */

export async function completeIntro(): Promise<void> {

  soundManager.stop('introBed');

  await markIntroSeen();

  appContext.setRuntimeState({ showIntro: false });

}

