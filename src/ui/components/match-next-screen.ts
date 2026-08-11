import { MATCH_ROUND_NAMES } from '../../config/match';

export function renderMatchNextScreenButton(params: {
  nextRound: 2 | 3;
  action: string;
  disabled?: boolean;
}): string {
  const roundName = MATCH_ROUND_NAMES[params.nextRound];
  const disabledAttr = params.disabled ? ' disabled aria-disabled="true"' : '';

  return `
    <div class="match-next-screen-zone">
      <button
        type="button"
        class="match-next-screen"
        data-action="${params.action}"
        aria-label="Sang màn ${params.nextRound} – ${roundName}"
        ${disabledAttr}
      >
        <span class="match-next-screen__label">Màn ${params.nextRound}</span>
        <span class="match-next-screen__arrow" aria-hidden="true">→</span>
      </button>
    </div>
  `;
}
