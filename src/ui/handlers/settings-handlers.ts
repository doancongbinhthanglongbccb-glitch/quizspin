import { appContext } from '../../core/state';
import type { SettingsSection, SoundEventKey } from '../../types';
import { textToRewardItems } from '../../data';
import { formatTimerDisplay } from '../../utils/timer-format';
import * as Actions from '../../core/actions';

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

export function bindSettingsHandlers(root: ParentNode): () => void {
  const onInput = (event: Event): void => {
    const timerSlider = getInputTarget<HTMLInputElement>(event, root, '#timer-slider');
    if (timerSlider) {
      updateTimerSliderPreview(root, Number(timerSlider.value));
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

    const uploadInput = getInputTarget<HTMLInputElement>(event, root, '[data-action="upload-sound"]');
    if (uploadInput?.files?.[0]) {
      const eventKey = readSoundEvent(uploadInput);
      if (eventKey) {
        void Actions.uploadSoundForEvent(eventKey, uploadInput.files[0]);
      }
      uploadInput.value = '';
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
  root.addEventListener('click', onClick);

  return () => {
    root.removeEventListener('input', onInput);
    root.removeEventListener('change', onChange);
    root.removeEventListener('click', onClick);
  };
}
