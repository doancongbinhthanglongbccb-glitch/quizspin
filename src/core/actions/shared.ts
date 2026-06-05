import { appContext } from '../state';
import { showToast } from '../toast';

export { startQuestionTimer, stopQuestionTimer as stopTimer } from '../question-timer';
export { showToast };

export function appendBankLog(message: string): void {
  const runtime = appContext.getRuntimeState();
  appContext.setRuntimeState({
    bankLogs: [...(runtime.bankLogs ?? []), { ts: Date.now(), message }],
  });
}
