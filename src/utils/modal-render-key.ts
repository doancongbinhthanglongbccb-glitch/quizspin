import type { RuntimeState } from '../core/state';
import type { AppState } from '../types';

/**
 * Chữ ký HTML modal — chỉ rebuild khi đổi.
 * Không gồm remaining/selectedAnswer/playerAnswer (cập nhật qua DOM).
 */
export function getModalRenderKey(appState: AppState, runtime: RuntimeState): string {
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

    return [
      'question',
      modal.categoryId,
      modal.questionId,
      question.question,
      question.answer,
      question.type,
      modal.submitted,
      modal.revealed,
      modal.paused,
      modal.readOnly ?? false,
      modal.timer,
    ].join('|');
  }

  if (modal.kind === 'gift') {
    return `gift|${modal.title}|${modal.text}`;
  }

  return `notice|${modal.text}`;
}
