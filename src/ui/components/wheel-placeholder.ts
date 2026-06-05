import type { AppState, RuntimeState } from '../../core/state';
import { DEFAULTS } from '../../config';
import { buildWheelSegments } from '../../data';

export function renderWheelPlaceholder(appState: AppState, runtime: RuntimeState): string {
  const segments = buildWheelSegments(appState.categories);
  const count = Math.max(segments.length, 1);
  const slice = 360 / count;
  const parts = segments
    .map((segment, index) => {
      const from = slice * index;
      const to = slice * (index + 1);
      return `${segment.color} ${from}deg ${to}deg`;
    })
    .join(', ');

  const labels = segments
    .map((segment, index) => {
      const angle = slice * index + slice / 2;
      return `<div class="wheel-label" style="--angle:${angle}deg; --radius:38%"><span>${segment.label}</span></div>`;
    })
    .join('');

  return `
    <div class="wheel-shell">
      <div class="wheel-pointer"></div>
      <div class="wheel" style="--spin-duration:${DEFAULTS.spinDurationMs}ms; transform: rotate(${runtime.rotation}deg); background: conic-gradient(${parts});">
        ${labels}
        <div class="wheel-center"></div>
      </div>
    </div>
  `;
}
