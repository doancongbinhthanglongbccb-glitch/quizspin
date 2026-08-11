import { appContext } from '../../core/state';
import * as Actions from '../../core/actions';
import { soundManager } from '../../core/sound-manager';
import { markAppEntryAnimation } from '../intro-transition';
import {
  getLogoFlightSwitchDelay,
  snapshotLogoRect,
  startLogoFlight,
} from '../intro-logo-transition';
import { INTRO_TIMING } from '../../config/intro';
import { openExternalUrl } from '../../utils/open-external-url';
import { showToast } from '../../core/toast';

let introExitPending = false;

/** Đang chạy animation thoát intro — không rebuild màn intro. */
export function isIntroExitInProgress(): boolean {
  return introExitPending;
}

function getActionTarget(event: Event, root: ParentNode, selector: string): HTMLElement | null {
  const target = event.target instanceof Element ? event.target.closest<HTMLElement>(selector) : null;
  return target && root.contains(target) ? target : null;
}

function finishIntroExit(): void {
  try {
    Actions.completeIntro();
  } finally {
    introExitPending = false;
  }
}

function beginIntroExit(root: ParentNode): void {
  const screen = root.querySelector<HTMLElement>('.intro-screen');
  const logo = root.querySelector<HTMLImageElement>('.intro-screen__logo');

  markAppEntryAnimation();
  soundManager.stop('introBed');

  let logoHandoff = false;
  if (logo) {
    logoHandoff = startLogoFlight(snapshotLogoRect(logo), logo.src);
    if (logoHandoff) {
      logo.classList.add('intro-screen__logo--handoff');
      screen?.classList.add('intro-screen--logo-handoff');
    }
  }

  if (!screen) {
    finishIntroExit();
    return;
  }

  screen.classList.add('intro-screen--exiting');

  let done = false;
  const complete = (): void => {
    if (done) {
      return;
    }
    done = true;
    screen.removeEventListener('animationend', onAnimationEnd);
    finishIntroExit();
  };

  const onAnimationEnd = (event: AnimationEvent): void => {
    if (event.target !== screen) {
      return;
    }
    if (logoHandoff && event.animationName === 'intro-backdrop-fade-out') {
      complete();
      return;
    }
    if (!logoHandoff && event.animationName === 'intro-fade-out') {
      complete();
    }
  };

  screen.addEventListener('animationend', onAnimationEnd);

  const switchDelay = logoHandoff
    ? getLogoFlightSwitchDelay() + 50
    : INTRO_TIMING.fullExitMs + 50;
  window.setTimeout(complete, switchDelay);
}

async function openIntroLink(url: string): Promise<void> {
  const trimmed = url.trim();
  if (!trimmed) {
    showToast('Chưa cấu hình liên kết');
    return;
  }

  const opened = await openExternalUrl(trimmed);
  if (!opened) {
    showToast('Không mở được liên kết');
  }
}

export function bindIntroHandlers(root: ParentNode): () => void {
  const startIntroMusic = (event?: Event): void => {
    // Bấm vào app ngay — không cần bật nhạc rồi tắt liền.
    if (
      event?.target instanceof Element &&
      event.target.closest('[data-action="complete-intro"]')
    ) {
      soundManager.unlock();
      return;
    }
    soundManager.unlock();
    soundManager.playLoop('introBed');
  };

  // Thử lúc mount (đã có gesture trước đó thì autoplay được).
  startIntroMusic();
  // Nếu bị chặn — phát lại ở lần chạm đầu trên màn intro.
  root.addEventListener('pointerdown', startIntroMusic, { once: true, passive: true });

  const onClick = (event: Event): void => {
    const linkBtn = getActionTarget(event, root, '[data-action="open-intro-link"]');
    if (linkBtn) {
      const encoded = linkBtn.dataset.introLinkUrl;
      if (encoded) {
        void openIntroLink(decodeURIComponent(encoded));
      }
      return;
    }

    if (!getActionTarget(event, root, '[data-action="complete-intro"]')) {
      return;
    }
    if (introExitPending) {
      return;
    }
    introExitPending = true;
    beginIntroExit(root);
  };

  root.addEventListener('click', onClick);
  return () => {
    root.removeEventListener('pointerdown', startIntroMusic);
    root.removeEventListener('click', onClick);
    soundManager.stop('introBed');
    introExitPending = false;
  };
}
