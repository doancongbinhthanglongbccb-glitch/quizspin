import { Capacitor } from '@capacitor/core';

function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Mở URL ngoài app — hoạt động trên Android WebView (window.open thường bị chặn). */
export async function openExternalUrl(url: string): Promise<boolean> {
  const trimmed = url.trim();
  if (!isSafeHttpUrl(trimmed)) {
    return false;
  }

  if (Capacitor.isNativePlatform()) {
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: trimmed });
      return true;
    } catch {
      // Fallback bên dưới.
    }
  }

  const popup = window.open(trimmed, '_blank', 'noopener,noreferrer');
  if (popup) {
    return true;
  }

  const link = document.createElement('a');
  link.href = trimmed;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
  return true;
}
