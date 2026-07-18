import { registerPlugin } from '@capacitor/core';

export type BackupSaverResult = {
  path: string;
  uri?: string;
};

type BackupSaverPlugin = {
  saveToDownloads(options: { filename: string; content: string }): Promise<BackupSaverResult>;
};

/** Android: lưu JSON thẳng vào thư mục Downloads công khai. */
export const BackupSaver = registerPlugin<BackupSaverPlugin>('BackupSaver');
