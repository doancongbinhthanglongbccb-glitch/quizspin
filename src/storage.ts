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

/**
 * Đọc JSON value từ storage (Preferences hoặc localStorage fallback)
 * Hỗ trợ cả Capacitor Preferences (mobile) và localStorage (web)
 */
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

/**
 * Ghi JSON value vào storage (atomically)
 */
export async function writeJson<T>(key: string, value: T): Promise<void> {
  const raw = JSON.stringify(value);
  try {
    await Preferences.set({ key, value: raw });
  } catch {
    await writeBrowser(key, raw);
  }
}

/**
 * Xóa value từ storage
 */
export async function removeValue(key: string): Promise<void> {
  try {
    await Preferences.remove({ key });
  } catch {
    await removeBrowser(key);
  }
}

/**
 * Load AppState từ single atomic key 'appState'
 * FIX: Trước dùng 2 keys riêng (settings, categories) → dễ inconsistency
 * Giờ dùng 1 key nguyên tử → safe hơn
 */
export async function loadState(): Promise<AppState | null> {
  return await readJson<AppState | null>('appState', null);
}

/**
 * Save AppState vào single atomic key 'appState'
 */
export const saveState = (state: AppState) => writeJson('appState', state);

/**
 * Clear AppState (xóa sạch toàn bộ dữ liệu)
 */
export async function clearState(): Promise<void> {
  await removeValue('appState');
}
