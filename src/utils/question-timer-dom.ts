export function updateQuestionTimerDom(remaining: number): void {
  const ring = document.querySelector<HTMLElement>('[data-question-timer-ring]');
  if (!ring) {
    return;
  }

  const total = Math.max(1, Number(ring.dataset.timerTotal) || 1);
  const circumference = Number(ring.dataset.timerCircumference) || 264;
  const progress = remaining / total;
  const dashOffset = circumference * (1 - progress);
  const danger = remaining > 0 && remaining <= 5;

  ring.classList.toggle('timer-ring--danger', danger);
  ring.setAttribute('aria-label', `Còn ${remaining} giây`);

  const valueEl = ring.querySelector('[data-question-timer-value]');
  if (valueEl) {
    valueEl.textContent = String(remaining);
  }

  const progressEl = ring.querySelector<SVGCircleElement>('[data-question-timer-progress]');
  if (progressEl) {
    progressEl.setAttribute('stroke-dashoffset', String(dashOffset));
    progressEl.setAttribute('stroke', danger ? 'url(#timer-ring-grad-danger)' : 'url(#timer-ring-grad)');
  }
}
