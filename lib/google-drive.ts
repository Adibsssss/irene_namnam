// Server-only. Never import this file from a Client Component — it holds
// the service account private key and makes authenticated calls to the
// Google Drive REST API directly (no heavyweight `googleapis` dependency
// needed for the handful of endpoints this app uses).

import { OAuth2Client } from "google-auth-library";
import { serverConfig } from "./config";
import type { Photo } from "@/types";

const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";

export class DriveApiError extends Error {
  constructor(
    message: string,
    public readonly detail: string,
  ) {
    super(message);
    this.name = "DriveApiError";
  }
}

async function safeErrorText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 500);
  } catch {
    return "";
  }
}

// An OAuth2Client caches its access token and auto-refreshes it using the
// stored refresh token, so one instance can live across warm invocations.
let oauthClient: OAuth2Client | null = null;

function getClient(): OAuth2Client {
  if (!oauthClient) {
    oauthClient = new OAuth2Client({
      clientId: serverConfig.oauthClientId,
      clientSecret: serverConfig.oauthClientSecret,
    });
    oauthClient.setCredentials({
      refresh_token: serverConfig.oauthRefreshToken,
    });
  }
  return oauthClient;
}

async function getAccessToken(): Promise<string> {
  const { token } = await getClient().getAccessToken();
  if (!token) {
    throw new DriveApiError(
      "Could not authenticate with Google Drive.",
      "empty access token",
    );
  }
  return token;
}

/**
 * Streams a file straight through to Google Drive without buffering it in
 * memory: the incoming request body is piped directly into the PUT request
 * of a Drive resumable upload session. This keeps memory flat regardless of
 * file size (important for a 100 MB cap on a modest Railway container) and
 * means the Drive session URL and credentials never reach the browser —
 * there's no separate "init" endpoint or client-side Google request at all.
 */
export async function uploadOriginalStream(params: {
  fileName: string;
  mimeType: string;
  fileSize: number;
  body: ReadableStream<Uint8Array>;
}): Promise<{ id: string; name: string; mimeType: string }> {
  const token = await getAccessToken();

  // Step 1: open a resumable session. This request has no file bytes in
  // it, so it completes almost instantly regardless of the photo's size.
  const initRes = await fetch(
    `${DRIVE_UPLOAD_URL}?uploadType=resumable&fields=id,name,mimeType`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": params.mimeType,
        "X-Upload-Content-Length": String(params.fileSize),
      },
      body: JSON.stringify({
        name: params.fileName,
        parents: [serverConfig.driveFolderId],
      }),
    },
  );

  if (!initRes.ok) {
    throw new DriveApiError(
      `Failed to start upload session (${initRes.status})`,
      await safeErrorText(initRes),
    );
  }

  const sessionUrl =
    initRes.headers.get("Location") ?? initRes.headers.get("location");
  if (!sessionUrl) {
    throw new DriveApiError(
      "Google Drive did not return an upload session.",
      "",
    );
  }

  // Step 2: stream the actual bytes. `duplex: 'half'` is required by the
  // Fetch spec (and Node's undici implementation) whenever the body is a
  // ReadableStream rather than a buffered value.
  const uploadRes = await fetch(sessionUrl, {
    method: "PUT",
    headers: {
      "Content-Type": params.mimeType,
      "Content-Length": String(params.fileSize),
    },
    body: params.body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });

  if (!uploadRes.ok) {
    throw new DriveApiError(
      `Upload to Drive failed (${uploadRes.status})`,
      await safeErrorText(uploadRes),
    );
  }

  return (await uploadRes.json()) as {
    id: string;
    name: string;
    mimeType: string;
  };
}

interface RawDriveFile {
  id: string;
  name: string;
  createdTime: string;
  mimeType: string;
  size?: string;
  thumbnailLink?: string;
  parents?: string[];
  imageMediaMetadata?: { width?: number; height?: number };
}

const LIST_FIELDS =
  "nextPageToken, files(id, name, createdTime, mimeType, imageMediaMetadata(width, height))";

export async function listPhotos(
  pageSize: number,
  pageToken?: string,
): Promise<{ photos: Photo[]; nextPageToken: string | null }> {
  const token = await getAccessToken();

  const url = new URL(DRIVE_FILES_URL);
  url.searchParams.set(
    "q",
    `'${serverConfig.driveFolderId}' in parents and mimeType contains 'image/' and trashed = false`,
  );
  url.searchParams.set("orderBy", "createdTime desc");
  url.searchParams.set("pageSize", String(pageSize));
  url.searchParams.set("fields", LIST_FIELDS);
  url.searchParams.set("spaces", "drive");
  if (pageToken) url.searchParams.set("pageToken", pageToken);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new DriveApiError(
      `Failed to list photos (${res.status})`,
      await safeErrorText(res),
    );
  }

  const data = (await res.json()) as {
    nextPageToken?: string;
    files?: RawDriveFile[];
  };

  const photos: Photo[] = (data.files ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    createdTime: f.createdTime,
    mimeType: f.mimeType,
    width: f.imageMediaMetadata?.width ?? null,
    height: f.imageMediaMetadata?.height ?? null,
  }));

  return { photos, nextPageToken: data.nextPageToken ?? null };
}

const DETAIL_FIELDS = "id, name, mimeType, size, thumbnailLink, parents";

/**
 * Fetches a single file's metadata and confirms it actually lives inside
 * the configured event folder. This second check matters because the
 * fileId in /api/image and /api/download comes straight from the URL —
 * without it, anything else the service account can see would be
 * reachable by guessing an ID.
 */
async function getVerifiedFile(fileId: string): Promise<RawDriveFile | null> {
  const token = await getAccessToken();
  const url = new URL(`${DRIVE_FILES_URL}/${fileId}`);
  url.searchParams.set("fields", DETAIL_FIELDS);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new DriveApiError(
      `Failed to read photo metadata (${res.status})`,
      await safeErrorText(res),
    );
  }

  const file = (await res.json()) as RawDriveFile;
  if (!file.parents?.includes(serverConfig.driveFolderId)) {
    return null;
  }
  return file;
}

async function fetchMedia(fileId: string): Promise<Response> {
  const token = await getAccessToken();
  const res = await fetch(`${DRIVE_FILES_URL}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new DriveApiError(
      `Failed to fetch photo (${res.status})`,
      await safeErrorText(res),
    );
  }
  return res;
}

/** Rewrites a Drive thumbnailLink's trailing size suffix, e.g. "...=s220" -> "...=s1600". */
function withThumbnailSize(thumbnailLink: string, size: number): string {
  const withoutSuffix = thumbnailLink.replace(/=s\d+(-c)?$/, "");
  return `${withoutSuffix}=s${size}`;
}

const THUMBNAIL_SIZE_PX = 640;
const LARGE_PREVIEW_SIZE_PX = 1920;

export interface PreviewResult {
  body: ReadableStream<Uint8Array>;
  contentType: string;
}

/**
 * Serves an optimized preview for the gallery grid ("thumb") or the
 * lightbox ("large"). Both prefer Google's server-generated thumbnail
 * (always a lightweight JPEG, regardless of the original's format) and
 * fall back to the original bytes only if Drive hasn't generated one yet
 * — which happens briefly right after upload.
 */
export async function getPreviewResponse(
  fileId: string,
  variant: "thumb" | "large",
): Promise<PreviewResult | null> {
  const file = await getVerifiedFile(fileId);
  if (!file) return null;

  if (file.thumbnailLink) {
    const size =
      variant === "large" ? LARGE_PREVIEW_SIZE_PX : THUMBNAIL_SIZE_PX;
    const res = await fetch(withThumbnailSize(file.thumbnailLink, size));
    if (res.ok && res.body) {
      return {
        body: res.body,
        contentType: res.headers.get("Content-Type") ?? "image/jpeg",
      };
    }
  }

  const media = await fetchMedia(fileId);
  if (!media.body) return null;
  return { body: media.body, contentType: file.mimeType };
}

export interface DownloadResult {
  body: ReadableStream<Uint8Array>;
  contentType: string;
  name: string;
}

/** Serves the untouched original file for the explicit "Save photo" action. */
export async function getDownloadResponse(
  fileId: string,
): Promise<DownloadResult | null> {
  const file = await getVerifiedFile(fileId);
  if (!file) return null;

  const media = await fetchMedia(fileId);
  if (!media.body) return null;
  return { body: media.body, contentType: file.mimeType, name: file.name };
}
