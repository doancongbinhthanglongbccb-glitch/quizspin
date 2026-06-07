import { appContext } from '../../core/state';
import * as Actions from '../../core/actions';
import { soundManager } from '../../core/sound-manager';
import { markAppEntryAnimation } from '../intro-transition';
import {
  clearLogoFlight,
  getLogoFlightSwitchDelay,
  snapshotLogoRect,
  startLogoFlight,
} from '../intro-logo-transition';
import { openExternalUrl } from '../../utils/open-external-url';
import { showToast } from '../../core/toast';

const INTRO_EXIT_MS = 480;

let introExitPending = false;

function getActionTarget(event: Event, root: ParentNode, selector: string): HTMLElement | null {
  const target = event.target instanceof Element ? event.target.closest<HTMLElement>(selector) : null;
  return target && root.contains(target) ? target : null;
}

async function finishIntroExit(): Promise<void> {
  try {
    await Actions.completeIntro();
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
    void finishIntroExit();
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
    void finishIntroExit();
  };

  const onAnimationEnd = (event: AnimationEvent): void => {
    if (event.target !== screen || event.animationName !== 'intro-fade-out') {
      return;
    }
    if (!logoHandoff) {
      complete();
    }
  };

  screen.addEventListener('animationend', onAnimationEnd);

  const switchDelay = logoHandoff ? getLogoFlightSwitchDelay() : INTRO_EXIT_MS + 50;
  window.setTimeout(complete, switchDelay);
}

async function openIntroLink(): Promise<void> {
  const url = appContext.getAppState().settings.introLink.url.trim();
  if (!url) {
    showToast('Chưa cấu hình liên kết');
    return;
  }

  const opened = await openExternalUrl(url);
  if (!opened) {
    showToast('Không mở được liên kết');
  }
}

export function bindIntroHandlers(root: ParentNode): () => void {
  soundManager.playLoop('introBed');

  const onClick = (event: Event): void => {
    if (getActionTarget(event, root, '[data-action="open-intro-link"]')) {
      void openIntroLink();
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
    root.removeEventListener('click', onClick);
    soundManager.stop('introBed');
    clearLogoFlight();
    introExitPending = false;
  };
}
