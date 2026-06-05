import type { CustomSound, SoundEventKey } from '../../types';
import { SOUND_EVENT_LABELS } from '../../data';
import { appContext } from '../state';
import { soundManager } from '../sound-manager';
import { showToast } from './shared';

const MAX_SOUND_BYTES = 2 * 1024 * 1024;

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

export function previewSoundEvent(eventKey: SoundEventKey): void {
  soundManager.play(eventKey);
}

export async function uploadSoundForEvent(eventKey: SoundEventKey, file: File): Promise<void> {
  if (!file.type.startsWith('audio/') && !/\.(mp3|wav|ogg|m4a|aac|webm)$/i.test(file.name)) {
    showToast('Chỉ hỗ trợ file âm thanh');
    return;
  }

  if (file.size > MAX_SOUND_BYTES) {
    showToast('File âm thanh tối đa 2MB');
    return;
  }

  try {
    const dataUrl = await readFileAsDataUrl(file);
    const sound: CustomSound = {
      id: crypto.randomUUID(),
      name: file.name.replace(/\.[^.]+$/, '') || file.name,
      mimeType: file.type || 'audio/mpeg',
      dataUrl,
    };

    appContext.setAppState((current) => {
      const library = [...(current.settings.sounds?.library ?? []), sound];
      return {
        ...current,
        settings: {
          ...current.settings,
          sounds: {
            bindings: { ...(current.settings.sounds?.bindings ?? {}), [eventKey]: sound.id },
            library,
          },
        },
      };
    });

    showToast(`Đã gán âm thanh: ${SOUND_EVENT_LABELS[eventKey]}`);
  } catch {
    showToast('Không đọc được file âm thanh');
  }
}

export function clearSoundBinding(eventKey: SoundEventKey): void {
  appContext.setAppState((current) => {
    const bindings = { ...(current.settings.sounds?.bindings ?? {}) };
    delete bindings[eventKey];

    return {
      ...current,
      settings: {
        ...current.settings,
        sounds: {
          bindings,
          library: current.settings.sounds?.library ?? [],
        },
      },
    };
  });

  showToast('Đã xóa âm thanh tùy chỉnh');
}
