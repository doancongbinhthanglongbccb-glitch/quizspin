import * as Actions from '../../core/actions';
import { soundManager } from '../../core/sound-manager';
import { markAppEntryAnimation } from '../intro-transition';

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
  if (!screen) {
    markAppEntryAnimation();
    finishIntroExit();
    return;
  }

  markAppEntryAnimation();
  soundManager.stop('introBed');
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
    complete();
  };

  screen.addEventListener('animationend', onAnimationEnd);
  window.setTimeout(complete, INTRO_EXIT_MS + 50);
}

export function bindIntroHandlers(root: ParentNode): () => void {
  soundManager.playLoop('introBed');

  const onClick = (event: Event): void => {
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
