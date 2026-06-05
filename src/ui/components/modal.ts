import type { AppState, RuntimeState } from '../../core/state';

export function renderModal(appState: AppState, runtime: RuntimeState): string {
  const modal = runtime.modal;
  if (!modal) {
    return '';
  }

  if (modal.kind === 'question') {
    const category = appState.categories.find((item) => item.id === modal.categoryId);
    const question = category?.questions.find((item) => item.id === modal.questionId);
    if (!category || !question) {
      return '';
    }

    const revealed = modal.revealed;
    const selectedAnswer = modal.selectedAnswer;
    const remaining = Math.max(0, modal.remaining);
    const danger = remaining > 0 && remaining <= 5;
    const badge = `<span class="badge" style="background:${category.color}">${category.name}</span>`;
    const options = question.options.length
      ? `<div class="option-grid">${question.options
          .map((option) => {
            const isCorrect = revealed && option === question.answer;
            const isSelected = selectedAnswer === option;
            const classes = [
              'option-chip',
              isSelected ? 'option-chip--selected' : '',
              isCorrect ? 'option-chip--correct' : '',
            ]
              .filter(Boolean)
              .join(' ');

                   return `<button type="button" class="${classes}" data-action="choose-answer" data-answer="${encodeURIComponent(option)}">${option}</button>`;
          })
          .join('')}</div>`
      : '';
    const answerBox = revealed ? `<div class="answer-box"><div class="answer-box__title">Đáp án</div><pre>${question.answer}</pre></div>` : '';

    return `
      <div class="modal-backdrop">
        <section class="modal-card modal-card--question">
          <div class="modal-header">
            ${badge}
            <div class="timer ${danger ? 'timer--danger' : ''}">${remaining}s</div>
          </div>
          <h2 class="modal-title">${question.question}</h2>
          ${options}
          ${answerBox}
          <div class="modal-actions">
            <button class="btn btn-ghost" data-action="toggle-pause">${modal.paused ? 'Tiếp tục' : 'Tạm dừng'}</button>
            <button class="btn btn-primary" data-action="reveal-answer">${revealed ? 'Đóng' : 'Hiện đáp án'}</button>
          </div>
        </section>
      </div>
    `;
  }

  if (modal.kind === 'gift') {
    return `
      <div class="modal-backdrop">
        <section class="modal-card modal-card--simple">
          <div class="modal-eyebrow">${modal.title}</div>
          <div class="modal-gift">${modal.text}</div>
          <div class="modal-actions modal-actions--center">
            <button class="btn btn-primary" data-action="close-modal">Đóng</button>
          </div>
        </section>
      </div>
    `;
  }

  return `
    <div class="modal-backdrop">
      <section class="modal-card modal-card--simple">
        <div class="modal-notice">${modal.text}</div>
        <div class="modal-actions modal-actions--center">
          <button class="btn btn-primary" data-action="close-modal">Đóng</button>
        </div>
      </section>
    </div>
  `;
}
