import { INTRO_COPY } from '../config/intro';

const LOGO_FLIGHT_MS = 640;
const APP_SWITCH_DELAY_MS = 160;

export type LogoFlightSnapshot = {
  left: number;
  top: number;
  width: number;
  height: number;
};

let pendingFlight: LogoFlightSnapshot | null = null;
let flightElement: HTMLImageElement | null = null;
let flightCleanupTimer: ReturnType<typeof setTimeout> | null = null;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function snapshotLogoRect(element: HTMLElement): LogoFlightSnapshot {
  const rect = element.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

export function getLogoFlightSwitchDelay(): number {
  return pendingFlight && !prefersReducedMotion() ? APP_SWITCH_DELAY_MS : 480;
}

export function startLogoFlight(from: LogoFlightSnapshot, src: string): boolean {
  if (prefersReducedMotion()) {
    return false;
  }

  clearLogoFlight();

  pendingFlight = from;
  const img = document.createElement('img');
  img.className = 'intro-logo-flight';
  img.src = src;
  img.alt = INTRO_COPY.logoAlt;
  img.decoding = 'sync';
  img.style.left = `${from.left}px`;
  img.style.top = `${from.top}px`;
  img.style.width = `${from.width}px`;
  img.style.height = `${from.height}px`;
  document.body.appendChild(img);
  flightElement = img;
  return true;
}

export function hasPendingLogoFlight(): boolean {
  return pendingFlight !== null && flightElement !== null;
}

export function runLogoFlightToHeader(headerLogo: HTMLElement): void {
  if (!flightElement || !pendingFlight) {
    return;
  }

  headerLogo.classList.add('app-header__logo--flight-pending');

  const from = pendingFlight;
  const to = headerLogo.getBoundingClientRect();
  const fromCenterX = from.left + from.width / 2;
  const fromCenterY = from.top + from.height / 2;
  const toCenterX = to.left + to.width / 2;
  const toCenterY = to.top + to.height / 2;
  const dx = toCenterX - fromCenterX;
  const dy = toCenterY - fromCenterY;
  const scale = to.width / from.width;

  const img = flightElement;
  img.style.transition = `transform ${LOGO_FLIGHT_MS}ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow ${LOGO_FLIGHT_MS}ms ease`;
  img.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
  img.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.35)';

  if (flightCleanupTimer) {
    clearTimeout(flightCleanupTimer);
  }

  flightCleanupTimer = setTimeout(() => {
    headerLogo.classList.remove('app-header__logo--flight-pending');
    headerLogo.classList.add('app-header__logo--landed');
    clearLogoFlight();
    window.setTimeout(() => headerLogo.classList.remove('app-header__logo--landed'), 420);
  }, LOGO_FLIGHT_MS + 30);
}

export function clearLogoFlight(): void {
  if (flightCleanupTimer) {
    clearTimeout(flightCleanupTimer);
    flightCleanupTimer = null;
  }
  flightElement?.remove();
  flightElement = null;
  pendingFlight = null;
}
