/** Bỏ qua intro khi resume sau file picker / browser (pause ngắn, không phải thoát app). */
let suppressIntroOnResume = false;

export function suppressAndroidIntroOnResume(): void {
  suppressIntroOnResume = true;
}

export function consumeAndroidIntroResumeSuppression(): boolean {
  if (!suppressIntroOnResume) {
    return false;
  }
  suppressIntroOnResume = false;
  return true;
}
