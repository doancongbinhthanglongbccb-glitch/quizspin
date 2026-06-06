import type { AnswerRecord, Category } from '../../types';
import { availableQuestion } from '../../data';
import { appContext } from '../state';
import { soundManager } from '../sound-manager';
import { questionRemainingSeconds } from '../question-timer';
import { showToast, startQuestionTimer, stopTimer } from './shared';
import { resetQuestionFlags } from './question-actions';

export function openQuestionModal(category: Category): void {
  const runtime = appContext.getRuntimeState();
  const allUsed =
    category.questions.length > 0 && category.questions.every((item) => runtime.usedQuestionIds.has(item.id));

  if (allUsed) {
    resetQuestionFlags(category);
  }

  const freshRuntime = appContext.getRuntimeState();
  const question = availableQuestion(category.questions, freshRuntime.usedQuestionIds);

  if (!question) {
    showToast(`Lĩnh vực ${category.name} đang trống`);
    return;
  }

  const usedQuestionIds = new Set(runtime.usedQuestionIds);
  usedQuestionIds.add(question.id);

  const timerSec = appContext.getAppState().settings.timer;
  const deadlineAt = Date.now() + timerSec * 1000;

  appContext.setRuntimeState({
    usedQuestionIds,
    modal: {
      kind: 'question',
      categoryId: category.id,
      questionId: question.id,
      timer: timerSec,
      deadlineAt,
      paused: false,
      revealed: false,
      remaining: timerSec,
      selectedAnswer: null,
      playerAnswer: null,
      submitted: false,
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

  soundManager.play(kind === 'gift' ? 'gift' : 'punishment');
}

export function openNoticeModal(text: string, sound: 'extraTurn' | 'loseTurn'): void {
  appContext.setRuntimeState({ modal: { kind: 'notice', text } });
  soundManager.play(sound);
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

  const modal = runtime.modal;

  if (!modal.paused) {
    const remaining = questionRemainingSeconds(modal.deadlineAt);
    appContext.setRuntimeState({
      modal: { ...modal, remaining, paused: true },
    });
    stopTimer();
    return;
  }

  const deadlineAt = Date.now() + modal.remaining * 1000;
  appContext.setRuntimeState({
    modal: { ...modal, deadlineAt, paused: false },
  });
  startQuestionTimer();
}

export function chooseQuestionAnswer(answer: string): void {
  const runtime = appContext.getRuntimeState();
  if (!runtime.modal || runtime.modal.kind !== 'question') {
    return;
  }

  if (runtime.modal.revealed || runtime.modal.submitted) {
    return;
  }

  const selectedAnswer = answer.trim();
  const nextModal = {
    ...runtime.modal,
    selectedAnswer,
    playerAnswer: selectedAnswer,
  };

  appContext.setRuntimeState({ modal: nextModal });
}

export function updatePlayerAnswer(answer: string): void {
  const runtime = appContext.getRuntimeState();
  if (!runtime.modal || runtime.modal.kind !== 'question') {
    return;
  }

  if (runtime.modal.revealed || runtime.modal.submitted) {
    return;
  }

  const nextModal = {
    ...runtime.modal,
    playerAnswer: answer,
  };

  appContext.patchRuntimeState({ modal: nextModal });
}

export function submitQuestionAnswer(): void {
  const runtime = appContext.getRuntimeState();
  const modal = runtime.modal;
  if (!modal || modal.kind !== 'question' || modal.submitted) {
    return;
  }

  const appState = appContext.getAppState();
  const category = appState.categories.find((item) => item.id === modal.categoryId);
  const question = category?.questions.find((item) => item.id === modal.questionId);

  const rawAnswer = (modal.playerAnswer ?? modal.selectedAnswer ?? '').trim();
  if (!rawAnswer) {
    return;
  }

  const total = Math.max(1, modal.timer);
  const remaining = questionRemainingSeconds(modal.deadlineAt);
  const elapsedSeconds = Math.min(total, total - remaining);
  const timeSpentMs = Math.max(0, elapsedSeconds * 1000);

  const isCorrect = !!question && rawAnswer === question.answer;

  stopTimer();

  const nextModal = {
    ...modal,
    playerAnswer: rawAnswer,
    remaining,
    submitted: true,
    revealed: true,
    paused: true,
  };

  const answerRecord: AnswerRecord | null = question
    ? {
        questionId: question.id,
        playerAnswer: rawAnswer,
        isCorrect,
        timeSpentMs,
        submittedAt: new Date().toISOString(),
      }
    : null;

  if (answerRecord) {
    appContext.setAppState((current) => ({
      ...current,
      answerHistory: [answerRecord, ...current.answerHistory],
    }));
  }

  appContext.setRuntimeState({ modal: nextModal });

  if (isCorrect) {
    soundManager.play('correct');
    showToast('Chính xác!');
    return;
  }

  soundManager.play('wrong');
  showToast(question ? `Sai rồi. Đáp án đúng: ${question.answer}` : 'Sai rồi.');
}
