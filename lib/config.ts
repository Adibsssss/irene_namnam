// Server-only. Never import this file from a Client Component.
// Centralizes env var access so a missing variable fails fast, with a
// clear message, the first time it's actually needed rather than
// silently producing broken uploads later.

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. See .env.local.example.`,
    );
  }
  return value;
}

export const serverConfig = {
  get oauthClientId(): string {
    return required("GOOGLE_OAUTH_CLIENT_ID");
  },
  get oauthClientSecret(): string {
    return required("GOOGLE_OAUTH_CLIENT_SECRET");
  },
  get oauthRefreshToken(): string {
    return required("GOOGLE_OAUTH_REFRESH_TOKEN");
  },
  get driveFolderId(): string {
    return required("GOOGLE_DRIVE_FOLDER_ID");
  },
  get maxFileSizeBytes(): number {
    const mb = Number(process.env.MAX_FILE_SIZE_MB ?? "100");
    return (Number.isFinite(mb) && mb > 0 ? mb : 100) * 1024 * 1024;
  },
  get galleryPageSize(): number {
    const size = Number(process.env.GALLERY_PAGE_SIZE ?? "20");
    return Number.isFinite(size) && size > 0 ? Math.min(size, 100) : 20;
  },
};

/** Image formats accepted for upload. HEIC/HEIF covers unmodified iPhone photos. */
export const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
