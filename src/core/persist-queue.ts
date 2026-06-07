import { showToast } from './toast';

let saveChain: Promise<void> = Promise.resolve();
let persistErrorNotified = false;

function notifyPersistError(): void {
  if (persistErrorNotified) {
    return;
  }
  persistErrorNotified = true;
  showToast('Không lưu được dữ liệu');
}

/** Xếp hàng ghi storage — tránh write chồng chéo ghi đè dữ liệu cũ. */
export function enqueuePersist(save: () => Promise<void>): void {
  saveChain = saveChain
    .then(save)
    .catch(() => {
      notifyPersistError();
    });
}

export function resetPersistErrorFlag(): void {
  persistErrorNotified = false;
}
