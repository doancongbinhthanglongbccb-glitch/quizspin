export function formatTimerDisplay(seconds: number): { value: string; unit: string } {
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    if (remainder === 0) {
      return { value: String(minutes), unit: 'phút' };
    }
    return {
      value: `${minutes}:${String(remainder).padStart(2, '0')}`,
      unit: 'phút',
    };
  }

  return { value: String(seconds), unit: 'giây' };
}
