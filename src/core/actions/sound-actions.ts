import type { CustomSound, SoundEventKey } from '../../types';
import { SOUND_EVENT_LABELS } from '../../data';
import { appContext } from '../state';
import { soundManager } from '../sound-manager';
import { showToast } from './shared';

const MAX_SOUND_BYTES = 2 * 1024 * 1024;
const ACCEPTED_AUDIO = /\.(mp3|wav|ogg|m4a|aac|webm)$/i;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Invalid file data'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Read failed'));
    reader.readAsDataURL(file);
  });
}

function isAudioFile(file: File): boolean {
  return file.type.startsWith('audio/') || ACCEPTED_AUDIO.test(file.name);
}

function pruneSoundLibrary(library: CustomSound[], bindings: Partial<Record<SoundEventKey, string>>): CustomSound[] {
  const usedIds = new Set(Object.values(bindings).filter((id): id is string => Boolean(id)));
  return library.filter((item) => usedIds.has(item.id));
}

function persistSoundBinding(eventKey: SoundEventKey, sound: CustomSound): void {
  appContext.setAppState((current) => {
    const bindings = { ...(current.settings.sounds?.bindings ?? {}), [eventKey]: sound.id };
    const library = pruneSoundLibrary([...(current.settings.sounds?.library ?? []), sound], bindings);
    return {
      ...current,
      settings: {
        ...current.settings,
        sounds: {
          bindings,
          library,
        },
      },
    };
  });
}

/** Nghe thử âm thanh hiện tại (mặc định hoặc đã gán) */
export function previewSoundEvent(eventKey: SoundEventKey): void {
  const draft = appContext.getRuntimeState().soundUploadDraft;
  if (draft?.eventKey === eventKey) {
    soundManager.previewDraft(draft.dataUrl, eventKey);
    return;
  }

  soundManager.previewEvent(eventKey);
}

/** Chọn file → preview ngay, chờ user bấm Lưu */
export async function stageSoundForEvent(eventKey: SoundEventKey, file: File): Promise<void> {
  if (!isAudioFile(file)) {
    showToast('Chỉ hỗ trợ .mp3, .wav, .ogg');
    return;
  }

  if (file.size > MAX_SOUND_BYTES) {
    showToast('File âm thanh tối đa 2MB');
    return;
  }

  try {
    const dataUrl = await readFileAsDataUrl(file);
    const draft = {
      eventKey,
      name: file.name.replace(/\.[^.]+$/, '') || file.name,
      mimeType: file.type || 'audio/mpeg',
      dataUrl,
    };

    appContext.setRuntimeState({ soundUploadDraft: draft });
    soundManager.previewDraft(dataUrl, eventKey);
    showToast(`Đang nghe thử: ${draft.name}. Bấm Lưu để gán.`);
  } catch {
    showToast('Không đọc được file âm thanh');
  }
}

/** Xác nhận lưu bản nháp upload vào storage */
export function confirmSoundUpload(eventKey: SoundEventKey): void {
  const draft = appContext.getRuntimeState().soundUploadDraft;
  if (!draft || draft.eventKey !== eventKey) {
    showToast('Không có file đang chờ lưu');
    return;
  }

  const sound: CustomSound = {
    id: crypto.randomUUID(),
    name: draft.name,
    mimeType: draft.mimeType,
    dataUrl: draft.dataUrl,
  };

  persistSoundBinding(eventKey, sound);
  appContext.setRuntimeState({ soundUploadDraft: null });
  soundManager.stopPreview();
  showToast(`Đã gán âm thanh: ${SOUND_EVENT_LABELS[eventKey]}`);
}

/** Hủy bản nháp upload */
export function cancelSoundUpload(): void {
  appContext.setRuntimeState({ soundUploadDraft: null });
  soundManager.stopPreview();
}

export function clearSoundBinding(eventKey: SoundEventKey): void {
  appContext.setAppState((current) => {
    const bindings = { ...(current.settings.sounds?.bindings ?? {}) };
    delete bindings[eventKey];
    const library = pruneSoundLibrary(current.settings.sounds?.library ?? [], bindings);

    return {
      ...current,
      settings: {
        ...current.settings,
        sounds: {
          bindings,
          library,
        },
      },
    };
  });

  const draft = appContext.getRuntimeState().soundUploadDraft;
  if (draft?.eventKey === eventKey) {
    appContext.setRuntimeState({ soundUploadDraft: null });
    soundManager.stopPreview();
  }

  showToast('Đã xóa âm thanh tùy chỉnh');
}
