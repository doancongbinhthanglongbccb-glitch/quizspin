import { appContext } from '../state';
import { soundManager } from '../sound-manager';
import { syncSpinUi } from '../../utils/sync-spin-ui';
import { showToast } from './shared';

function pickRandomItem<T>(items: T[]): T | null {
  if (items.length === 0) {
    return null;
  }
  return items[Math.floor(Math.random() * items.length)];
}

export function openGiftModal(kind: 'gift' | 'punishment'): void {
  const appState = appContext.getAppState();
  const runtime = appContext.getRuntimeState();
  const items = kind === 'gift' ? appState.settings.gifts : appState.settings.punishments;

  if (!items || items.length === 0) {
    appContext.setRuntimeState({
      modal: {
        kind: 'gift',
        title: kind === 'gift' ? 'Quà tặng 🎁' : 'Hình phạt 😈',
        text: 'Chưa có dữ liệu.',
      },
    });
    return;
  }

  const usedSet = kind === 'gift' ? new Set(runtime.usedGifts) : new Set(runtime.usedPunishments);
  const candidates = items.filter((it) => !usedSet.has(it.id));

  let chosen = pickRandomItem(candidates);
  if (!chosen) {
    usedSet.clear();
    chosen = pickRandomItem(items);
  }

  if (!chosen) {
    return;
  }

  usedSet.add(chosen.id);

  appContext.setRuntimeState({
    ...(kind === 'gift' ? { usedGifts: usedSet } : { usedPunishments: usedSet }),
    modal: {
      kind: 'gift',
      title: kind === 'gift' ? 'Quà tặng 🎁' : 'Hình phạt 😈',
      text: chosen.text,
    },
  });

  soundManager.play(kind === 'gift' ? 'gift' : 'punishment');
}

export function closeModal(): void {
  appContext.setRuntimeState({ modal: null });
  syncSpinUi();
}
