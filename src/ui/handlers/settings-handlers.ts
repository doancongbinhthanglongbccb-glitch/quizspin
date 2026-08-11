import { appContext, type SettingsDraft } from '../../core/state';
import type { IntroLinkSettings, MatchSettings, SettingsSection, SoundEventKey } from '../../types';
import { normalizeIntroLinks, compactIntroLinks, DEFAULT_INTRO_LINK_LABEL } from '../../data';
import { MAX_INTRO_LINKS } from '../../types';
import { renderIntroLinksEditor } from '../components/settings-tab';
import { defaultMatchSettings, normalizeMatchSettings } from '../../config/match';
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

function currentMatchSettings(): MatchSettings {
  const settings = appContext.getAppState().settings;
  return settings.match ?? defaultMatchSettings(settings.timer);
}

function commitMatchSettings(next: MatchSettings): void {
  appContext.setAppState((current) => ({
    ...current,
    settings: {
      ...current.settings,
      match: normalizeMatchSettings(next, current.settings.timer),
    },
  }));
}

const MATCH_SCALAR_FIELDS = new Set([
  'round1QuestionCount',
  'round1TimerSec',
  'round2QuestionsPerPack',
  'round2TimerSec',
  'round3QuestionCount',
  'round3TimerSec',
  'round3PackagePickSec',
]);

function commitMatchScalarField(field: string, raw: string, options?: { force?: boolean }): void {
  if (!MATCH_SCALAR_FIELDS.has(field)) {
    return;
  }
  const trimmed = raw.trim();
  if (!options?.force && (trimmed === '' || !Number.isFinite(Number(trimmed)))) {
    return;
  }
  const match = currentMatchSettings();
  commitMatchSettings({
    ...match,
    [field]: Number(trimmed),
  });
}

function commitMatchPackageField(
  packageId: string,
  field: 'points' | 'timerSec',
  raw: string,
  options?: { force?: boolean },
): void {
  const trimmed = raw.trim();
  if (!options?.force && (trimmed === '' || !Number.isFinite(Number(trimmed)))) {
    return;
  }
  const match = currentMatchSettings();
  commitMatchSettings({
    ...match,
    round3Packages: match.round3Packages.map((pkg) =>
      pkg.id === packageId ? { ...pkg, [field]: Number(trimmed) } : pkg,
    ),
  });
}

function patchSettingsDraft(patch: SettingsDraft): void {
  const current = appContext.getRuntimeState().settingsDraft ?? {};
  appContext.patchRuntimeState({
    settingsDraft: { ...current, ...patch },
  });
}

function readIntroLinksFromDom(root: ParentNode): IntroLinkSettings[] {
  const rows = root.querySelectorAll<HTMLElement>('[data-intro-link-row]');
  return Array.from(rows).map((row) => {
    const label = row.querySelector<HTMLInputElement>('[data-settings-field="intro-link-label"]')?.value ?? '';
    const url = row.querySelector<HTMLInputElement>('[data-settings-field="intro-link-url"]')?.value ?? '';
    return { label: label.trim(), url: url.trim() };
  });
}

function syncIntroLinksEditor(root: ParentNode, links: IntroLinkSettings[]): void {
  const editor = root.querySelector<HTMLElement>('#intro-links-editor');
  if (!editor) {
    return;
  }
  editor.innerHTML = renderIntroLinksEditor(links);
}

function addIntroLink(root: ParentNode): void {
  const links = readIntroLinksFromDom(root);
  if (links.length >= MAX_INTRO_LINKS) {
    return;
  }

  const next = [
    ...links,
    {
      label: links.length === 0 ? DEFAULT_INTRO_LINK_LABEL : '',
      url: '',
    },
  ];
  patchSettingsDraft({ introLinks: next });
  syncIntroLinksEditor(root, next);
  root.querySelector<HTMLInputElement>(`#intro-link-url-input-${next.length - 1}`)?.focus();
}

function removeIntroLink(root: ParentNode, index: number): void {
  const links = readIntroLinksFromDom(root);
  if (index < 0 || index >= links.length) {
    return;
  }

  const next = links.filter((_, itemIndex) => itemIndex !== index);
  patchSettingsDraft({ introLinks: next });
  syncIntroLinksEditor(root, next);
}

function hasIntroLinkInputs(root: ParentNode): boolean {
  return Boolean(root.querySelector('[data-settings-field="intro-link-label"], [data-settings-field="intro-link-url"]'));
}

function readSettingsDraftFromDom(root: ParentNode): SettingsDraft {
  const draft: SettingsDraft = { ...(appContext.getRuntimeState().settingsDraft ?? {}) };

  if (hasIntroLinkInputs(root)) {
    draft.introLinks = readIntroLinksFromDom(root);
  }

  return draft;
}

function persistSettingsDraft(draft: SettingsDraft): void {
  const hasIntro = draft.introLinks !== undefined;

  if (!hasIntro) {
    return;
  }

  appContext.setAppStateWithoutRender((state) => {
    const settings = { ...state.settings };
    settings.introLinks = compactIntroLinks(
      normalizeIntroLinks(draft.introLinks ?? state.settings.introLinks, state.settings.introLinks[0]),
    );
    return { ...state, settings };
  });

  appContext.patchRuntimeStateWithoutRender({ settingsDraft: null });
}

function flushSettingsFromDom(root: ParentNode): void {
  if (!hasIntroLinkInputs(root)) {
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
    // Không commit số match trên mỗi lần gõ — tránh rebuild + nhảy IME (ă!).
    // Chỉ draft intro links.
    const introField = getInputTarget<HTMLInputElement>(event, root, '[data-settings-field="intro-link-label"], [data-settings-field="intro-link-url"]');
    if (introField) {
      patchSettingsDraft({ introLinks: readIntroLinksFromDom(root) });
    }
  };

  const onChange = (event: Event): void => {
    const matchField = getInputTarget<HTMLInputElement>(event, root, '[data-match-field]');
    if (matchField?.dataset.matchField) {
      commitMatchScalarField(matchField.dataset.matchField, matchField.value, { force: true });
      return;
    }

    const matchPackageField = getInputTarget<HTMLInputElement>(event, root, '[data-match-package-field]');
    if (matchPackageField?.dataset.packageId && matchPackageField.dataset.matchPackageField) {
      const field = matchPackageField.dataset.matchPackageField;
      if (field === 'points' || field === 'timerSec') {
        commitMatchPackageField(matchPackageField.dataset.packageId, field, matchPackageField.value, {
          force: true,
        });
      }
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
      return;
    }

    const backupInput = getInputTarget<HTMLInputElement>(event, root, '#backup-import-input');
    if (backupInput) {
      const file = backupInput.files?.[0];
      if (file) {
        Actions.stageBackupImport(file);
      }
      backupInput.value = '';
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
      return;
    }

    if (getActionTarget(event, root, '[data-action="export-backup"]')) {
      Actions.exportAppBackup();
      return;
    }

    if (getActionTarget(event, root, '[data-action="clear-used-questions"]')) {
      Actions.requestClearUsedQuestions();
      return;
    }

    if (getActionTarget(event, root, '[data-action="clear-all"]')) {
      Actions.requestClearAllData();
      return;
    }

    if (getActionTarget(event, root, '[data-action="add-intro-link"]')) {
      addIntroLink(root);
      return;
    }

    const removeIntroBtn = getActionTarget(event, root, '[data-action="remove-intro-link"]');
    if (removeIntroBtn?.dataset.introLinkIndex !== undefined) {
      const index = Number(removeIntroBtn.dataset.introLinkIndex);
      if (!Number.isNaN(index)) {
        removeIntroLink(root, index);
      }
      return;
    }

    if (getActionTarget(event, root, '[data-action="match-add-package"]')) {
      const match = currentMatchSettings();
      commitMatchSettings({
        ...match,
        round3Packages: [
          ...match.round3Packages,
          { id: crypto.randomUUID(), points: 10, timerSec: 20 },
        ],
      });
      return;
    }

    const removePackageBtn = getActionTarget(event, root, '[data-action="match-remove-package"]');
    if (removePackageBtn?.dataset.packageId) {
      const match = currentMatchSettings();
      if (match.round3Packages.length <= 1) {
        return;
      }
      const nextPackages = match.round3Packages.filter((pkg) => pkg.id !== removePackageBtn.dataset.packageId);
      commitMatchSettings({
        ...match,
        round3Packages: nextPackages,
        round3DefaultPackageId: nextPackages.some((pkg) => pkg.id === match.round3DefaultPackageId)
          ? match.round3DefaultPackageId
          : nextPackages[0]!.id,
      });
      return;
    }

    const defaultPackageBtn = getActionTarget(event, root, '[data-action="match-default-package"]');
    if (defaultPackageBtn?.dataset.packageId) {
      const match = currentMatchSettings();
      commitMatchSettings({
        ...match,
        round3DefaultPackageId: defaultPackageBtn.dataset.packageId,
      });
    }
  };

  const onFilePickerOpen = (event: Event): void => {
    const target = event.target;
    if (
      target instanceof HTMLInputElement &&
      (target.dataset.action === 'pick-sound' || target.id === 'backup-import-input')
    ) {
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
