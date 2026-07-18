import type { AppState, QuestionPools } from '../types';
import { isNativeApp } from '../utils/platform';

export const BACKUP_VERSION = 1 as const;

export type BackupPayload = {
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  appState: AppState;
  pools: QuestionPools;
};

/** Bỏ thư viện âm thanh custom — default sounds nằm trong app. */
export function stripCustomSounds(state: AppState): AppState {
  return {
    ...state,
    settings: {
      ...state.settings,
      sounds: {
        bindings: {},
        library: [],
      },
    },
  };
}

export function buildBackupPayload(appState: AppState, pools: QuestionPools): BackupPayload {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    appState: stripCustomSounds(appState),
    pools: { ...pools },
  };
}

export function parseBackupPayload(raw: unknown): { ok: true; payload: BackupPayload } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'File backup không hợp lệ' };
  }

  const data = raw as Partial<BackupPayload>;
  if (data.version !== BACKUP_VERSION) {
    return { ok: false, error: `Phiên bản backup không hỗ trợ (cần v${BACKUP_VERSION})` };
  }

  const appState = data.appState;
  if (!appState || typeof appState !== 'object') {
    return { ok: false, error: 'Backup thiếu dữ liệu appState' };
  }

  if (!Array.isArray(appState.categories) || appState.categories.length === 0) {
    return { ok: false, error: 'Backup không có lĩnh vực nào' };
  }

  if (!appState.settings || typeof appState.settings !== 'object') {
    return { ok: false, error: 'Backup thiếu phần cài đặt' };
  }

  const pools =
    data.pools && typeof data.pools === 'object' && !Array.isArray(data.pools)
      ? (data.pools as QuestionPools)
      : {};

  return {
    ok: true,
    payload: {
      version: BACKUP_VERSION,
      exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString(),
      appState: stripCustomSounds(appState as AppState),
      pools,
    },
  };
}

export function backupFilename(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `quizspin-backup-${y}${m}${d}.json`;
}

function downloadBackupOnWeb(filename: string, json: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Web: tải file. Android: ghi cache rồi mở Share sheet (Lưu vào Files / Drive…). */
export async function downloadBackupJson(filename: string, payload: BackupPayload): Promise<void> {
  const json = JSON.stringify(payload, null, 2);

  if (!isNativeApp()) {
    downloadBackupOnWeb(filename, json);
    return;
  }

  const { Directory, Encoding, Filesystem } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');
  const path = `backups/${filename}`;

  await Filesystem.writeFile({
    path,
    data: json,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
    recursive: true,
  });

  const { uri } = await Filesystem.getUri({
    path,
    directory: Directory.Cache,
  });

  await Share.share({
    title: filename,
    dialogTitle: 'Lưu / gửi file backup',
    files: [uri],
  });
}
