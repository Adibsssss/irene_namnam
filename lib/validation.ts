import { ALLOWED_MIME_TYPES, serverConfig } from './config';

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

/**
 * Strips path separators and control characters from a client-supplied file
 * name. We never trust this for anything beyond a display label — Drive
 * assigns the authoritative file ID.
 */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'photo';
  const cleaned = base.replace(/[\x00-\x1f\x7f]/g, '').trim();
  return cleaned.length > 0 ? cleaned.slice(0, 200) : 'photo';
}

export function validateUploadRequest(input: {
  fileName?: unknown;
  mimeType?: unknown;
  fileSize?: unknown;
}): ValidationResult {
  if (typeof input.fileName !== 'string' || input.fileName.trim() === '') {
    return { ok: false, error: 'A file name is required.' };
  }
  if (typeof input.mimeType !== 'string' || !ALLOWED_MIME_TYPES.has(input.mimeType)) {
    return { ok: false, error: 'Only JPEG, PNG, WebP, or HEIC photos are supported.' };
  }
  if (typeof input.fileSize !== 'number' || !Number.isFinite(input.fileSize) || input.fileSize <= 0) {
    return { ok: false, error: 'The file appears to be empty.' };
  }
  if (input.fileSize > serverConfig.maxFileSizeBytes) {
    const maxMb = Math.round(serverConfig.maxFileSizeBytes / (1024 * 1024));
    return { ok: false, error: `Photos must be smaller than ${maxMb} MB.` };
  }
  return { ok: true };
}

export function isValidDriveFileId(id: string): boolean {
  // Drive file IDs are URL-safe base64-ish strings. This is a loose but
  // effective guard against path traversal / header injection attempts.
  return /^[A-Za-z0-9_-]{10,100}$/.test(id);
}
