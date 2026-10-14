'use client';

import { useCallback, useRef, useState } from 'react';
import type { Photo, UploadTask } from '@/types';

const CONCURRENCY_LIMIT = 3;

// Kept a little under Railway's documented 5-minute HTTP request ceiling so
// the client surfaces a clear, well-labeled timeout instead of a generic
// network error when the platform's proxy would otherwise cut the
// connection first.
const CLIENT_TIMEOUT_MS = 4.5 * 60 * 1000;

function makeTaskId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Some mobile browsers report an empty MIME type for camera-captured HEIC files. */
function inferMimeType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    case 'heif':
      return 'image/heif';
    default:
      return 'application/octet-stream';
  }
}

interface UploadResult {
  id: string;
  name: string;
  mimeType: string;
}

/**
 * Uploads the raw file body directly to our own /api/upload route, which
 * streams it through to Google Drive server-side. There's no separate
 * "init" call and no client request to Google at all — see the README for
 * why this is possible (and preferable) on Railway.
 */
function uploadFile(file: File, mimeType: string, onProgress: (pct: number) => void): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);
    xhr.timeout = CLIENT_TIMEOUT_MS;
    xhr.setRequestHeader('Content-Type', mimeType);
    xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name));
    xhr.setRequestHeader('X-File-Size', String(file.size));

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as UploadResult);
        } catch {
          reject(new Error('Upload finished but the response was unreadable.'));
        }
        return;
      }
      let message = `Upload failed (${xhr.status}).`;
      try {
        const body = JSON.parse(xhr.responseText) as { error?: string };
        if (body?.error) message = body.error;
      } catch {
        // Keep the generic message above.
      }
      reject(new Error(message));
    };

    xhr.onerror = () => reject(new Error('A network error interrupted the upload.'));
    xhr.ontimeout = () =>
      reject(new Error('The upload timed out — this can happen with a large photo on a slow connection.'));
    xhr.onabort = () => reject(new Error('Upload cancelled.'));

    xhr.send(file);
  });
}

interface UseUploadOptions {
  onPhotoUploaded: (photo: Photo) => void;
}

export function useUpload({ onPhotoUploaded }: UseUploadOptions) {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const filesById = useRef<Map<string, File>>(new Map());
  const queue = useRef<{ file: File; taskId: string }[]>([]);
  const activeCount = useRef(0);

  const updateTask = useCallback((id: string, patch: Partial<UploadTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const removeTask = useCallback((id: string) => {
    filesById.current.delete(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const runOne = useCallback(
    async (file: File, taskId: string) => {
      updateTask(taskId, { status: 'uploading', progress: 0, errorMessage: undefined });
      try {
        const mimeType = inferMimeType(file);
        const result = await uploadFile(file, mimeType, (pct) => updateTask(taskId, { progress: pct }));
        updateTask(taskId, { status: 'done', progress: 100 });
        onPhotoUploaded({
          id: result.id,
          name: result.name || file.name,
          createdTime: new Date().toISOString(),
          width: null,
          height: null,
          mimeType: result.mimeType || mimeType,
        });
        setTimeout(() => removeTask(taskId), 1800);
      } catch (err) {
        updateTask(taskId, {
          status: 'error',
          errorMessage: err instanceof Error ? err.message : 'Upload failed.',
        });
      }
    },
    [onPhotoUploaded, removeTask, updateTask]
  );

  const pump = useCallback(() => {
    while (activeCount.current < CONCURRENCY_LIMIT && queue.current.length > 0) {
      const next = queue.current.shift();
      if (!next) break;
      activeCount.current += 1;
      runOne(next.file, next.taskId).finally(() => {
        activeCount.current -= 1;
        pump();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runOne]);

  const enqueueFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files);
      const newTasks: UploadTask[] = list.map((file) => ({
        id: makeTaskId(),
        fileName: file.name,
        status: 'queued',
        progress: 0,
      }));
      setTasks((prev) => [...prev, ...newTasks]);
      newTasks.forEach((task, i) => {
        const file = list[i];
        if (!file) return;
        filesById.current.set(task.id, file);
        queue.current.push({ file, taskId: task.id });
      });
      pump();
    },
    [pump]
  );

  const retryTask = useCallback(
    (taskId: string) => {
      const file = filesById.current.get(taskId);
      if (!file) return;
      updateTask(taskId, { status: 'queued', progress: 0, errorMessage: undefined });
      queue.current.push({ file, taskId });
      pump();
    },
    [pump, updateTask]
  );

  return { tasks, enqueueFiles, retryTask, removeTask };
}
