export function syncQuestionPauseButton(paused: boolean): void {
  const button = document.querySelector<HTMLButtonElement>('[data-action="toggle-pause"]');
  if (!button) {
    return;
  }

  button.textContent = paused ? 'Tiếp tục' : 'Tạm dừng';
}
