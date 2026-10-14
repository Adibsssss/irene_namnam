'use client';

import type { UploadTask } from '@/types';

interface UploadProgressProps {
  tasks: UploadTask[];
  onRetry: (taskId: string) => void;
  onDismiss: (taskId: string) => void;
}

export function UploadProgress({ tasks, onRetry, onDismiss }: UploadProgressProps) {
  if (tasks.length === 0) return null;

  const total = tasks.length;
  const active = tasks.find((t) => t.status === 'uploading') ?? tasks.find((t) => t.status === 'queued');
  const errorTasks = tasks.filter((t) => t.status === 'error');
  const activeIndex = active ? tasks.indexOf(active) + 1 : total;
  const activePct = active?.status === 'uploading' ? active.progress : 0;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-md animate-slide-up rounded-2xl border border-white/70 bg-paper/95 p-4 shadow-[0_12px_32px_rgba(30,42,120,0.18)] backdrop-blur">
        {active && (
          <>
            <p className="text-[13px] text-ink">
              Uploading {activeIndex} of {total} &mdash; {activePct}%
            </p>
            <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-coral transition-[width] duration-150 ease-out"
                style={{ width: `${activePct}%` }}
              />
            </div>
          </>
        )}

        {errorTasks.length > 0 && (
          <ul className={active ? 'mt-3 space-y-2 border-t border-line pt-3' : 'space-y-2'}>
            {errorTasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-3 text-[13px]">
                <span className="truncate text-ink">Couldn&rsquo;t upload {task.fileName}</span>
                <div className="flex flex-none items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onRetry(task.id)}
                    className="font-medium text-ink underline underline-offset-2"
                  >
                    Try again
                  </button>
                  <button
                    type="button"
                    onClick={() => onDismiss(task.id)}
                    aria-label="Dismiss"
                    className="text-muted"
                  >
                    &times;
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
