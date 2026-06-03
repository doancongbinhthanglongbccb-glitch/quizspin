import { Preferences } from '@capacitor/preferences';
import type { AppState } from './types';

const browserPrefix = 'quizspin:';

async function readBrowser(key: string): Promise<string | null> {
  return localStorage.getItem(`${browserPrefix}${key}`);
}

async function writeBrowser(key: string, value: string): Promise<void> {
  localStorage.setItem(`${browserPrefix}${key}`, value);
}

async function removeBrowser(key: string): Promise<void> {
  localStorage.removeItem(`${browserPrefix}${key}`);
}

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const result = await Preferences.get({ key });
    const raw = result.value ?? (await readBrowser(key));
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson<T>(key: string, value: T): Promise<void> {
  const raw = JSON.stringify(value);
  try {
    await Preferences.set({ key, value: raw });
  } catch {
    await writeBrowser(key, raw);
  }
}

export async function removeValue(key: string): Promise<void> {
  try {
    await Preferences.remove({ key });
  } catch {
    await removeBrowser(key);
  }
}

export async function loadState(): Promise<AppState | null> {
  const settings = await readJson<AppState['settings'] | null>('settings', null);
  const categories = await readJson<AppState['categories'] | null>('categories', null);

  if (!settings || !categories) {
    return null;
  }

  return { settings, categories };
}

export async function saveState(state: AppState): Promise<void> {
  await Promise.all([writeJson('settings', state.settings), writeJson('categories', state.categories)]);
}

export async function clearState(): Promise<void> {
  await Promise.all([removeValue('settings'), removeValue('categories')]);
}
