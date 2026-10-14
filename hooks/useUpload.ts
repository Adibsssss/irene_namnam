"use client";

import { useCallback, useRef, useState } from "react";
import type { Photo, UploadTask } from "@/types";

const CONCURRENCY_LIMIT = 3;
const CLIENT_TIMEOUT_MS = 4.5 * 60 * 1000;

function makeTaskId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function inferMimeType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "heic":
      return "image/heic";
    case "heif":
      return "image/heif";
    default:
      return "application/octet-stream";
  }
}

interface UploadResult {
  id: string;
  name: string;
  mimeType: string;
}

interface UploadCredentials {
  cloudName: string;
  apiKey: string;
  publicId: string;
  tag: string;
  context: string;
  timestamp: number;
  signature: string;
}

/** The server validates file metadata and signs a short-lived Cloudinary upload. */
async function getUploadCredentials(file: File, mimeType: string): Promise<UploadCredentials> {
  const response = await fetch("/api/upload-signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, mimeType, fileSize: file.size }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "Could not prepare the upload.");
  }
  return response.json() as Promise<UploadCredentials>;
}

/** Sends bytes directly to Cloudinary, avoiding Vercel serverless body limits. */
async function uploadFile(
  file: File,
  mimeType: string,
  onProgress: (pct: number) => void,
): Promise<UploadResult> {
  const credentials = await getUploadCredentials(file, mimeType);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${credentials.cloudName}/image/upload`,
      true,
    );
    xhr.timeout = CLIENT_TIMEOUT_MS;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const body = JSON.parse(xhr.responseText) as {
            public_id: string;
            format?: string;
          };
          resolve({
            id: body.public_id,
            name: file.name,
            mimeType: body.format
              ? `image/${body.format === "jpg" ? "jpeg" : body.format}`
              : mimeType,
          });
        } catch {
          reject(new Error("Upload finished but the response was unreadable."));
        }
        return;
      }
      reject(new Error(`Upload failed (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("A network error interrupted the upload."));
    xhr.ontimeout = () =>
      reject(new Error("The upload timed out; try again on a stronger connection."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));

    const form = new FormData();
    form.append("file", file);
    form.append("api_key", credentials.apiKey);
    form.append("timestamp", String(credentials.timestamp));
    form.append("signature", credentials.signature);
    form.append("public_id", credentials.publicId);
    form.append("tags", credentials.tag);
    form.append("context", credentials.context);
    xhr.send(form);
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
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, ...patch } : task)));
  }, []);

  const removeTask = useCallback((id: string) => {
    filesById.current.delete(id);
    setTasks((prev) => prev.filter((task) => task.id !== id));
  }, []);

  const runOne = useCallback(
    async (file: File, taskId: string) => {
      updateTask(taskId, { status: "uploading", progress: 0, errorMessage: undefined });
      try {
        const mimeType = inferMimeType(file);
        const result = await uploadFile(file, mimeType, (progress) =>
          updateTask(taskId, { progress }),
        );
        updateTask(taskId, { status: "done", progress: 100 });
        onPhotoUploaded({
          id: result.id,
          name: result.name || file.name,
          createdTime: new Date().toISOString(),
          width: null,
          height: null,
          mimeType: result.mimeType || mimeType,
        });
        setTimeout(() => removeTask(taskId), 1800);
      } catch (error) {
        updateTask(taskId, {
          status: "error",
          errorMessage: error instanceof Error ? error.message : "Upload failed.",
        });
      }
    },
    [onPhotoUploaded, removeTask, updateTask],
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
  }, [runOne]);

  const enqueueFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files);
      const newTasks: UploadTask[] = list.map((file) => ({
        id: makeTaskId(),
        fileName: file.name,
        status: "queued",
        progress: 0,
      }));
      setTasks((previous) => [...previous, ...newTasks]);
      newTasks.forEach((task, index) => {
        const file = list[index];
        if (!file) return;
        filesById.current.set(task.id, file);
        queue.current.push({ file, taskId: task.id });
      });
      pump();
    },
    [pump],
  );

  const retryTask = useCallback(
    (taskId: string) => {
      const file = filesById.current.get(taskId);
      if (!file) return;
      updateTask(taskId, { status: "queued", progress: 0, errorMessage: undefined });
      queue.current.push({ file, taskId });
      pump();
    },
    [pump, updateTask],
  );

  return { tasks, enqueueFiles, retryTask, removeTask };
}
