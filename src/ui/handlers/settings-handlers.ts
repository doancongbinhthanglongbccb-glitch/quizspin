import { appContext } from '../../core/state';
import type { SettingsSection, SoundEventKey } from '../../types';
import { textToRewardItems } from '../../data';
import { formatTimerDisplay } from '../../utils/timer-format';
import { debounce } from '../../utils/debounce';
import * as Actions from '../../core/actions';

const REWARD_DEBOUNCE_MS = 400;
const INTRO_LINK_DEBOUNCE_MS = 400;

function getInputTarget<T extends HTMLInputElement | HTMLTextAreaElement>(event: Event, root: ParentNode, selector: string): T | null {
  const target = event.target instanceof Element ? event.target.closest(selector) : null;
  return target && root.contains(target) ? (target as T) : null;
}

function getActionTarget(event: Event, root: ParentNode, selector: string): HTMLElement | null {
  const target = event.target instanceof Element ? event.target.closest<HTMLElement>(selector) : null;
  return target && root.contains(target) ? target : null;
}

function readSoundEvent(target: HTMLElement): SoundEventKey | null {
  const value = target.dataset.soundEvent;
  if (!value) {
    return null;
  }
  return value as SoundEventKey;
}

function updateTimerSliderPreview(root: ParentNode, seconds: number): void {
  const { value, unit } = formatTimerDisplay(seconds);
  const valueEl = root.querySelector('#timer-slider-value');
  const unitEl = root.querySelector('#timer-slider-unit');
  if (valueEl) {
    valueEl.textContent = value;
  }
  if (unitEl) {
    unitEl.textContent = unit;
  }
}

function commitTimerValue(seconds: number): void {
  appContext.setAppState((current) => ({
    ...current,
    settings: { ...current.settings, timer: seconds },
  }));
}

function commitIntroLink(label: string, url: string): void {
  appContext.setAppState((current) => ({
    ...current,
    settings: {
      ...current.settings,
      introLink: {
        label: label.trim(),
        url: url.trim(),
      },
    },
  }));
}

export function bindSettingsHandlers(root: ParentNode): () => void {
  const commitGifts = (value: string): void => {
    appContext.setAppState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        gifts: textToRewardItems(value, current.settings.gifts, (text) => ({ id: crypto.randomUUID(), text })),
      },
    }));
    appContext.setRuntimeState({ usedGifts: new Set() });
  };

  const commitPunishments = (value: string): void => {
    appContext.setAppState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        punishments: textToRewardItems(value, current.settings.punishments, (text) => ({ id: crypto.randomUUID(), text })),
      },
    }));
    appContext.setRuntimeState({ usedPunishments: new Set() });
  };

  const commitGiftsDebounced = debounce(commitGifts, REWARD_DEBOUNCE_MS);
  const commitPunishmentsDebounced = debounce(commitPunishments, REWARD_DEBOUNCE_MS);
  const commitIntroLinkDebounced = debounce(() => {
    const labelEl = root.querySelector<HTMLInputElement>('#intro-link-label-input');
    const urlEl = root.querySelector<HTMLInputElement>('#intro-link-url-input');
    if (labelEl && urlEl) {
      commitIntroLink(labelEl.value, urlEl.value);
    }
  }, INTRO_LINK_DEBOUNCE_MS);

  const onInput = (event: Event): void => {
    const timerSlider = getInputTarget<HTMLInputElement>(event, root, '#timer-slider');
    if (timerSlider) {
      updateTimerSliderPreview(root, Number(timerSlider.value));
      return;
    }

    const giftsInput = getInputTarget<HTMLTextAreaElement>(event, root, '#gifts-input');
    if (giftsInput) {
      commitGiftsDebounced(giftsInput.value);
      return;
    }

    const punishmentsInput = getInputTarget<HTMLTextAreaElement>(event, root, '#punishments-input');
    if (punishmentsInput) {
      commitPunishmentsDebounced(punishmentsInput.value);
      return;
    }

    const introLabelInput = getInputTarget<HTMLInputElement>(event, root, '#intro-link-label-input');
    const introUrlInput = getInputTarget<HTMLInputElement>(event, root, '#intro-link-url-input');
    if (introLabelInput || introUrlInput) {
      commitIntroLinkDebounced();
    }
  };

  const onChange = (event: Event): void => {
    const timerSlider = getInputTarget<HTMLInputElement>(event, root, '#timer-slider');
    if (timerSlider) {
      commitTimerValue(Number(timerSlider.value));
      return;
    }

    const soundToggle = getInputTarget<HTMLInputElement>(event, root, '#sound-toggle');
    if (soundToggle) {
      appContext.setAppState((current) => ({
        ...current,
        settings: { ...current.settings, sound: soundToggle.checked },
      }));
      return;
    }

    const uploadInput = getInputTarget<HTMLInputElement>(event, root, '[data-action="pick-sound"]');
    if (uploadInput?.files?.[0]) {
      const eventKey = readSoundEvent(uploadInput);
      if (eventKey) {
        void Actions.stageSoundForEvent(eventKey, uploadInput.files[0]);
      }
      uploadInput.value = '';
    }
  };

  const onBlur = (event: Event): void => {
    const giftsInput = getInputTarget<HTMLTextAreaElement>(event, root, '#gifts-input');
    if (giftsInput) {
      commitGiftsDebounced.cancel();
      commitGifts(giftsInput.value);
      return;
    }

    const punishmentsInput = getInputTarget<HTMLTextAreaElement>(event, root, '#punishments-input');
    if (punishmentsInput) {
      commitPunishmentsDebounced.cancel();
      commitPunishments(punishmentsInput.value);
      return;
    }

    const introLabelInput = getInputTarget<HTMLInputElement>(event, root, '#intro-link-label-input');
    const introUrlInput = getInputTarget<HTMLInputElement>(event, root, '#intro-link-url-input');
    if (introLabelInput || introUrlInput) {
      commitIntroLinkDebounced.cancel();
      const labelEl = root.querySelector<HTMLInputElement>('#intro-link-label-input');
      const urlEl = root.querySelector<HTMLInputElement>('#intro-link-url-input');
      if (labelEl && urlEl) {
        commitIntroLink(labelEl.value, urlEl.value);
      }
    }
  };

  const onClick = (event: Event): void => {
    const sectionButton = getActionTarget(event, root, '[data-action="settings-section"]');
    if (sectionButton?.dataset.section) {
      appContext.setRuntimeState({ settingsSection: sectionButton.dataset.section as SettingsSection });
      return;
    }

    const previewButton = getActionTarget(event, root, '[data-action="preview-sound"]');
    if (previewButton) {
      const eventKey = readSoundEvent(previewButton);
      if (eventKey) {
        Actions.previewSoundEvent(eventKey);
      }
      return;
    }

    const confirmButton = getActionTarget(event, root, '[data-action="confirm-sound"]');
    if (confirmButton) {
      const eventKey = readSoundEvent(confirmButton);
      if (eventKey) {
        Actions.confirmSoundUpload(eventKey);
      }
      return;
    }

    const cancelButton = getActionTarget(event, root, '[data-action="cancel-sound"]');
    if (cancelButton) {
      Actions.cancelSoundUpload();
      return;
    }

    const clearButton = getActionTarget(event, root, '[data-action="clear-sound"]');
    if (clearButton) {
      const eventKey = readSoundEvent(clearButton);
      if (eventKey) {
        Actions.clearSoundBinding(eventKey);
      }
    }
  };

  root.addEventListener('input', onInput);
  root.addEventListener('change', onChange);
  root.addEventListener('blur', onBlur, true);
  root.addEventListener('click', onClick);

  const flushPendingSettings = (): void => {
    commitGiftsDebounced.cancel();
    commitPunishmentsDebounced.cancel();
    commitIntroLinkDebounced.cancel();

    const giftsInput = root.querySelector<HTMLTextAreaElement>('#gifts-input');
    if (giftsInput) {
      commitGifts(giftsInput.value);
    }

    const punishmentsInput = root.querySelector<HTMLTextAreaElement>('#punishments-input');
    if (punishmentsInput) {
      commitPunishments(punishmentsInput.value);
    }

    const labelEl = root.querySelector<HTMLInputElement>('#intro-link-label-input');
    const urlEl = root.querySelector<HTMLInputElement>('#intro-link-url-input');
    if (labelEl && urlEl) {
      commitIntroLink(labelEl.value, urlEl.value);
    }
  };

  return () => {
    flushPendingSettings();
    root.removeEventListener('input', onInput);
    root.removeEventListener('change', onChange);
    root.removeEventListener('blur', onBlur, true);
    root.removeEventListener('click', onClick);
  };
}
