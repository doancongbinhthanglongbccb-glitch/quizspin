import { appContext } from '../../core/state';
import * as Actions from '../../core/actions';
import { soundManager } from '../../core/sound-manager';
import { markAppEntryAnimation } from '../intro-transition';
import {
  getLogoFlightSwitchDelay,
  snapshotLogoRect,
  startLogoFlight,
} from '../intro-logo-transition';

const INTRO_EXIT_MS = 480;

let introExitPending = false;

function getActionTarget(event: Event, root: ParentNode, selector: string): HTMLElement | null {
  const target = event.target instanceof Element ? event.target.closest<HTMLElement>(selector) : null;
  return target && root.contains(target) ? target : null;
}

function finishIntroExit(): void {
  introExitPending = false;
  void Actions.completeIntro();
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

function isSafeExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function openIntroLink(): void {
  const url = appContext.getAppState().settings.introLink.url.trim();
  if (!isSafeExternalUrl(url)) {
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function bindIntroHandlers(root: ParentNode): () => void {
  soundManager.playLoop('introBed');

  const onClick = (event: Event): void => {
    if (getActionTarget(event, root, '[data-action="open-intro-link"]')) {
      openIntroLink();
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
    introExitPending = false;
  };
}
