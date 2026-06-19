import { appContext } from '../core/state';

export function canSwitchTab(): boolean {
  const runtime = appContext.getRuntimeState();
  return !runtime.spinning && !runtime.modal && !runtime.quizSession && !runtime.confirmDialog && !runtime.examPicker && !runtime.showIntro;
}

export function canReplayIntro(): boolean {
  const runtime = appContext.getRuntimeState();
  return !runtime.spinning && !runtime.quizSession;
}

export function getNavigationBlockReason(): string | null {
  const runtime = appContext.getRuntimeState();
  if (runtime.spinning) {
    return 'Đang quay, vui lòng chờ';
  }
  if (runtime.quizSession) {
    return 'Đang làm bài thi';
  }
  if (runtime.modal) {
    return 'Đang hiển thị kết quả';
  }
  if (runtime.examPicker) {
    return 'Đang chọn đề thi';
  }
  if (runtime.confirmDialog) {
    return 'Hoàn tất thao tác xác nhận trước';
  }
  if (runtime.showIntro) {
    return 'Đang ở màn Intro';
  }
  return null;
}
