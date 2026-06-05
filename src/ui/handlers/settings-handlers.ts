import { appContext } from '../../core/state';
import { textToRewardItems } from '../../data';

function getInputTarget<T extends HTMLInputElement | HTMLTextAreaElement>(event: Event, root: ParentNode, selector: string): T | null {
  const target = event.target instanceof Element ? event.target.closest(selector) : null;
  return target && root.contains(target) ? (target as T) : null;
}

export function bindSettingsHandlers(root: ParentNode): () => void {
  const onInput = (event: Event): void => {
    const timerSlider = getInputTarget<HTMLInputElement>(event, root, '#timer-slider');
    if (timerSlider) {
      appContext.setAppState((current) => ({
        ...current,
        settings: { ...current.settings, timer: Number(timerSlider.value) },
      }));
      return;
    }

    const giftsInput = getInputTarget<HTMLTextAreaElement>(event, root, '#gifts-input');
    if (giftsInput) {
      appContext.setAppState((current) => ({
        ...current,
        settings: {
          ...current.settings,
          gifts: textToRewardItems(giftsInput.value, current.settings.gifts, (text) => ({ id: crypto.randomUUID(), text })),
        },
      }));
      appContext.setRuntimeState({ usedGifts: new Set() });
      return;
    }

    const punishmentsInput = getInputTarget<HTMLTextAreaElement>(event, root, '#punishments-input');
    if (punishmentsInput) {
      appContext.setAppState((current) => ({
        ...current,
        settings: {
          ...current.settings,
          punishments: textToRewardItems(punishmentsInput.value, current.settings.punishments, (text) => ({ id: crypto.randomUUID(), text })),
        },
      }));
      appContext.setRuntimeState({ usedPunishments: new Set() });
    }
  };

  const onChange = (event: Event): void => {
    const soundToggle = getInputTarget<HTMLInputElement>(event, root, '#sound-toggle');
    if (!soundToggle) {
      return;
    }

    appContext.setAppState((current) => ({
      ...current,
      settings: { ...current.settings, sound: soundToggle.checked },
    }));
  };

  root.addEventListener('input', onInput);
  root.addEventListener('change', onChange);

  return () => {
    root.removeEventListener('input', onInput);
    root.removeEventListener('change', onChange);
  };
}