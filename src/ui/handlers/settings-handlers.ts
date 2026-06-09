import { appContext, type SettingsDraft } from '../../core/state';
import type { SettingsSection, SoundEventKey } from '../../types';
import { rewardItemsToText, textToRewardItems } from '../../data';
import { formatTimerDisplay } from '../../utils/timer-format';
import * as Actions from '../../core/actions';
import { suppressAndroidIntroOnResume } from '../../utils/android-intro-resume';

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

function patchSettingsDraft(patch: SettingsDraft): void {
  const current = appContext.getRuntimeState().settingsDraft ?? {};
  appContext.patchRuntimeState({
    settingsDraft: { ...current, ...patch },
  });
}

function readSettingsDraftFromDom(root: ParentNode): SettingsDraft {
  const draft: SettingsDraft = { ...(appContext.getRuntimeState().settingsDraft ?? {}) };
  const giftsInput = root.querySelector<HTMLTextAreaElement>('#gifts-input');
  const punishmentsInput = root.querySelector<HTMLTextAreaElement>('#punishments-input');
  const introLabelInput = root.querySelector<HTMLInputElement>('#intro-link-label-input');
  const introUrlInput = root.querySelector<HTMLInputElement>('#intro-link-url-input');

  if (giftsInput) {
    draft.gifts = giftsInput.value;
  }
  if (punishmentsInput) {
    draft.punishments = punishmentsInput.value;
  }
  if (introLabelInput) {
    draft.introLabel = introLabelInput.value;
  }
  if (introUrlInput) {
    draft.introUrl = introUrlInput.value;
  }

  return draft;
}

function persistSettingsDraft(draft: SettingsDraft): void {
  const hasGifts = draft.gifts !== undefined;
  const hasPunishments = draft.punishments !== undefined;
  const hasIntro = draft.introLabel !== undefined || draft.introUrl !== undefined;

  if (!hasGifts && !hasPunishments && !hasIntro) {
    return;
  }

  const current = appContext.getAppState();
  const giftsChanged = hasGifts && (draft.gifts ?? '').trim() !== rewardItemsToText(current.settings.gifts).trim();
  const punishmentsChanged =
    hasPunishments && (draft.punishments ?? '').trim() !== rewardItemsToText(current.settings.punishments).trim();

  appContext.setAppStateWithoutRender((state) => {
    const settings = { ...state.settings };

    if (hasGifts) {
      settings.gifts = textToRewardItems(draft.gifts ?? '', state.settings.gifts, (text) => ({
        id: crypto.randomUUID(),
        text,
      }));
    }

    if (hasPunishments) {
      settings.punishments = textToRewardItems(draft.punishments ?? '', state.settings.punishments, (text) => ({
        id: crypto.randomUUID(),
        text,
      }));
    }

    if (hasIntro) {
      settings.introLink = {
        label: (draft.introLabel ?? state.settings.introLink.label).trim(),
        url: (draft.introUrl ?? state.settings.introLink.url).trim(),
      };
    }

    return { ...state, settings };
  });

  const runtimePatch: Partial<ReturnType<typeof appContext.getRuntimeState>> = {
    settingsDraft: null,
  };
  if (giftsChanged) {
    runtimePatch.usedGifts = new Set();
  }
  if (punishmentsChanged) {
    runtimePatch.usedPunishments = new Set();
  }
  appContext.patchRuntimeStateWithoutRender(runtimePatch);
}

export function flushSettingsFromDom(root: ParentNode): void {
  const giftsInput = root.querySelector('#gifts-input');
  const punishmentsInput = root.querySelector('#punishments-input');
  const introLabelInput = root.querySelector('#intro-link-label-input');
  const introUrlInput = root.querySelector('#intro-link-url-input');

  if (!giftsInput && !punishmentsInput && !introLabelInput && !introUrlInput) {
    const draft = appContext.getRuntimeState().settingsDraft;
    if (draft) {
      persistSettingsDraft(draft);
    }
    return;
  }

  persistSettingsDraft(readSettingsDraftFromDom(root));
}

function switchSettingsSection(section: SettingsSection): void {
  if (appContext.getRuntimeState().settingsSection === section) {
    return;
  }
  appContext.setRuntimeState({ settingsSection: section });
}

export function bindSettingsHandlers(root: ParentNode): () => void {
  let sectionHandledByPointer = false;

  const onInput = (event: Event): void => {
    const timerSlider = getInputTarget<HTMLInputElement>(event, root, '#timer-slider');
    if (timerSlider) {
      updateTimerSliderPreview(root, Number(timerSlider.value));
      return;
    }

    const giftsInput = getInputTarget<HTMLTextAreaElement>(event, root, '#gifts-input');
    if (giftsInput) {
      patchSettingsDraft({ gifts: giftsInput.value });
      return;
    }

    const punishmentsInput = getInputTarget<HTMLTextAreaElement>(event, root, '#punishments-input');
    if (punishmentsInput) {
      patchSettingsDraft({ punishments: punishmentsInput.value });
      return;
    }

    const introLabelInput = getInputTarget<HTMLInputElement>(event, root, '#intro-link-label-input');
    const introUrlInput = getInputTarget<HTMLInputElement>(event, root, '#intro-link-url-input');
    if (introLabelInput || introUrlInput) {
      const labelEl = root.querySelector<HTMLInputElement>('#intro-link-label-input');
      const urlEl = root.querySelector<HTMLInputElement>('#intro-link-url-input');
      patchSettingsDraft({
        introLabel: labelEl?.value,
        introUrl: urlEl?.value,
      });
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

  const onSectionSwitch = (event: Event): void => {
    const sectionButton = getActionTarget(event, root, '[data-action="settings-section"]');
    if (!sectionButton?.dataset.section) {
      return;
    }

    patchSettingsDraft(readSettingsDraftFromDom(root));
    sectionHandledByPointer = true;
    switchSettingsSection(sectionButton.dataset.section as SettingsSection);
    queueMicrotask(() => {
      sectionHandledByPointer = false;
    });
  };

  const onClick = (event: Event): void => {
    const sectionButton = getActionTarget(event, root, '[data-action="settings-section"]');
    if (sectionButton?.dataset.section) {
      if (!sectionHandledByPointer) {
        patchSettingsDraft(readSettingsDraftFromDom(root));
        switchSettingsSection(sectionButton.dataset.section as SettingsSection);
      }
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

  const onFilePickerOpen = (event: Event): void => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.dataset.action === 'pick-sound') {
      suppressAndroidIntroOnResume();
    }
  };

  root.addEventListener('input', onInput);
  root.addEventListener('change', onChange);
  root.addEventListener('click', onFilePickerOpen, true);
  const supportsPointerEvents = typeof window !== 'undefined' && 'PointerEvent' in window;
  if (supportsPointerEvents) {
    root.addEventListener('pointerdown', onSectionSwitch);
  } else {
    root.addEventListener('mousedown', onSectionSwitch);
  }
  root.addEventListener('click', onClick);

  return () => {
    flushSettingsFromDom(root);
    root.removeEventListener('input', onInput);
    root.removeEventListener('change', onChange);
    root.removeEventListener('click', onFilePickerOpen, true);
    if (supportsPointerEvents) {
      root.removeEventListener('pointerdown', onSectionSwitch);
    } else {
      root.removeEventListener('mousedown', onSectionSwitch);
    }
    root.removeEventListener('click', onClick);
  };
}
