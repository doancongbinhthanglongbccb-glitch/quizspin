/** Gọi fn tối đa một lần mỗi `waitMs` — dùng cho action nặng / double-click */
export function throttle<T extends (...args: never[]) => void>(fn: T, waitMs: number): T {
  let locked = false;

  return ((...args: Parameters<T>) => {
    if (locked) {
      return;
    }

    locked = true;
    fn(...args);
    window.setTimeout(() => {
      locked = false;
    }, waitMs);
  }) as T;
}
