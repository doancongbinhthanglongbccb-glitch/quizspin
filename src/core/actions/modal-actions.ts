import type { Category } from '../../types';
import { availableQuestion } from '../../data';
import { appContext } from '../state';
import { playTone, showToast, startQuestionTimer, stopTimer } from './shared';

export function openQuestionModal(category: Category): void {
  const runtime = appContext.getRuntimeState();
  const question = availableQuestion(category.questions, runtime.usedQuestionIds);

  if (!question) {
    showToast(`Lĩnh vực ${category.name} đang trống`);
    return;
  }

  const usedQuestionIds = new Set(runtime.usedQuestionIds);
  usedQuestionIds.add(question.id);

  appContext.setRuntimeState({
    usedQuestionIds,
    modal: {
      kind: 'question',
      categoryId: category.id,
      questionId: question.id,
      timer: appContext.getAppState().settings.timer,
      paused: false,
      revealed: false,
      remaining: appContext.getAppState().settings.timer,
      selectedAnswer: null,
    },
  });

  startQuestionTimer();
}

export function openGiftModal(kind: 'gift' | 'punishment'): void {
  const appState = appContext.getAppState();
  const runtime = appContext.getRuntimeState();
  const items = kind === 'gift' ? appState.settings.gifts : appState.settings.punishments;

  if (!items || items.length === 0) {
    appContext.setRuntimeState({
      modal: {
        kind: 'gift',
        title: kind === 'gift' ? 'Quà tặng 🎁' : 'Hình phạt 😈',
        text: 'Chưa có dữ liệu.',
      },
    });
    return;
  }

  const usedSet = kind === 'gift' ? new Set(runtime.usedGifts) : new Set(runtime.usedPunishments);
  const candidates = items.filter((it) => !usedSet.has(it.id));

  let chosen = candidates[0];
  if (!chosen) {
    usedSet.clear();
    chosen = items[Math.floor(Math.random() * items.length)];
  }

  usedSet.add(chosen.id);

  appContext.setRuntimeState(
    kind === 'gift'
      ? { usedGifts: usedSet }
      : { usedPunishments: usedSet },
  );

  appContext.setRuntimeState({
    modal: {
      kind: 'gift',
      title: kind === 'gift' ? 'Quà tặng 🎁' : 'Hình phạt 😈',
      text: chosen.text,
    },
  });
}

export function openNoticeModal(text: string): void {
  appContext.setRuntimeState({ modal: { kind: 'notice', text } });
}

export function closeModal(): void {
  stopTimer();
  appContext.setRuntimeState({ modal: null });
}

export function toggleQuestionPause(): void {
  const runtime = appContext.getRuntimeState();
  if (!runtime.modal || runtime.modal.kind !== 'question') {
    return;
  }

  const nextModal = { ...runtime.modal, paused: !runtime.modal.paused };
  appContext.setRuntimeState({ modal: nextModal });

  if (!nextModal.paused) {
    startQuestionTimer();
  } else {
    stopTimer();
  }
}

export function revealAnswer(): void {
  const runtime = appContext.getRuntimeState();
  if (!runtime.modal) {
    return;
  }

  if (runtime.modal.kind === 'question' && !runtime.modal.revealed) {
    const nextModal = { ...runtime.modal, revealed: true, paused: true };
    appContext.setRuntimeState({ modal: nextModal });
    stopTimer();
    playTone(660, 420, 'triangle');
    return;
  }

  closeModal();
}

export function chooseQuestionAnswer(answer: string): void {
  const runtime = appContext.getRuntimeState();
  if (!runtime.modal || runtime.modal.kind !== 'question') {
    return;
  }

  if (runtime.modal.revealed || runtime.modal.selectedAnswer) {
    return;
  }

  const selectedAnswer = answer.trim();
  const nextModal = { ...runtime.modal, selectedAnswer, revealed: true, paused: true };

  appContext.setRuntimeState({ modal: nextModal });
  stopTimer();

  const appState = appContext.getAppState();
  const category = appState.categories.find((item) => item.id === runtime.modal.categoryId);
  const question = category?.questions.find((item) => item.id === runtime.modal.questionId);

  if (question && selectedAnswer === question.answer) {
    playTone(880, 180, 'sine');
    showToast('Chính xác!');
    return;
  }

  playTone(220, 260, 'sawtooth');
  showToast(question ? `Sai rồi. Đáp án đúng: ${question.answer}` : 'Sai rồi.');
}
