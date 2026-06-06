let animateAppEntry = false;

export function markAppEntryAnimation(): void {
  animateAppEntry = true;
}

export function consumeAppEntryAnimation(): boolean {
  const shouldAnimate = animateAppEntry;
  animateAppEntry = false;
  return shouldAnimate;
}
