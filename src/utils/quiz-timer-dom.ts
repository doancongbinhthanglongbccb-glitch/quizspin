import { QUIZ_CONFIG } from '../config/quiz';

function formatTimerDisplay(seconds: number): { value: string; unit: string } {
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return { value: `${m}:${String(s).padStart(2, '0')}`, unit: 'phút' };
  }
  return { value: String(seconds), unit: 'giây' };
}

function timerStrokeUrl(remaining: number): string {
  if (remaining > 0 && remaining <= QUIZ_CONFIG.dangerThresholdSec) {
    return 'url(#quiz-timer-grad-danger)';
  }
  if (remaining > QUIZ_CONFIG.dangerThresholdSec && remaining <= QUIZ_CONFIG.warningThresholdSec) {
    return 'url(#quiz-timer-grad-warning)';
  }
  return 'url(#quiz-timer-grad)';
}

export function updateQuizTimerDom(remaining: number, totalSec: number): void {
  const ring = document.querySelector<HTMLElement>('[data-quiz-timer-ring]');
  if (!ring) {
    return;
  }

  const total = Math.max(1, totalSec);
  const progress = remaining / total;
  const circumference = Number(ring.dataset.timerCircumference ?? 0);
  const dashOffset = circumference * (1 - progress);
  const danger = remaining > 0 && remaining <= QUIZ_CONFIG.dangerThresholdSec;
  const warning = remaining > QUIZ_CONFIG.dangerThresholdSec && remaining <= QUIZ_CONFIG.warningThresholdSec;

  ring.classList.toggle('timer-ring--danger', danger);
  ring.classList.toggle('timer-ring--warning', warning);
  ring.setAttribute('aria-label', `Còn ${remaining} giây`);
  ring.style.setProperty('--timer-offset', String(dashOffset));

  const { value, unit } = formatTimerDisplay(remaining);
  const valueEl = ring.querySelector('[data-quiz-timer-value]');
  if (valueEl) {
    valueEl.textContent = value;
  }

  const unitEl = ring.querySelector('[data-quiz-timer-unit]');
  if (unitEl) {
    unitEl.textContent = unit;
  }

  const progressEl = ring.querySelector<SVGCircleElement>('[data-quiz-timer-progress]');
  if (progressEl) {
    progressEl.setAttribute('stroke-dashoffset', String(dashOffset));
    progressEl.setAttribute('stroke', timerStrokeUrl(remaining));
  }
}

export function syncQuizProgressDom(answeredCount: number, total: number): void {
  const answeredEl = document.querySelector('.quiz-session__progress-answered');
  if (answeredEl) {
    answeredEl.textContent = `${answeredCount} đã trả lời`;
  }
}

export function syncQuizQuestionGrid(root: ParentNode, currentIndex: number, answeredFlags: boolean[]): void {
  root.querySelectorAll<HTMLElement>('[data-quiz-grid-item]').forEach((button, index) => {
    const answered = answeredFlags[index] ?? false;
    button.classList.toggle('quiz-grid__item--current', index === currentIndex);
    button.classList.toggle('quiz-grid__item--answered', answered);
    button.setAttribute('aria-current', index === currentIndex ? 'step' : 'false');
  });

  const currentEl = document.querySelector('.quiz-session__progress-current');
  if (currentEl) {
    currentEl.textContent = `Câu ${currentIndex + 1}/${answeredFlags.length}`;
  }
}
