import { randomUUID } from "crypto";
import { v2 as cloudinary } from "cloudinary";
import { serverConfig } from "./config";
import type { Photo } from "@/types";

export class CloudinaryApiError extends Error {
  constructor(
    message: string,
    public readonly detail: string,
  ) {
    super(message);
    this.name = "CloudinaryApiError";
  }
}

function client() {
  cloudinary.config({
    cloud_name: serverConfig.cloudinaryCloudName,
    api_key: serverConfig.cloudinaryApiKey,
    api_secret: serverConfig.cloudinaryApiSecret,
    secure: true,
  });
  return cloudinary;
}

function mimeType(format: string | undefined): string {
  switch (format?.toLowerCase()) {
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
      return "image/jpeg";
  }
}

interface CloudinaryAsset {
  public_id: string;
  original_filename?: string;
  context?: { custom?: { filename?: string } };
  created_at: string;
  width?: number;
  height?: number;
  format?: string;
  tags?: string[];
}

function toPhoto(asset: CloudinaryAsset): Photo {
  return {
    id: asset.public_id,
    name: readFileName(asset) || "Wedding photo",
    createdTime: asset.created_at,
    width: asset.width ?? null,
    height: asset.height ?? null,
    mimeType: mimeType(asset.format),
  };
}

function readFileName(asset: CloudinaryAsset): string | null {
  const encoded = asset.context?.custom?.filename;
  if (encoded) {
    try {
      return decodeURIComponent(encoded);
    } catch {
      return encoded;
    }
  }
  return asset.original_filename ?? null;
}

export function createUploadSignature(fileName: string): {
  cloudName: string;
  apiKey: string;
  publicId: string;
  tag: string;
  context: string;
  timestamp: number;
  signature: string;
} {
  const publicId = randomUUID();
  const tag = serverConfig.cloudinaryTag;
  const context = `filename=${encodeURIComponent(fileName)}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = client().utils.api_sign_request(
    { context, public_id: publicId, tags: tag, timestamp },
    serverConfig.cloudinaryApiSecret,
  );
  return {
    cloudName: serverConfig.cloudinaryCloudName,
    apiKey: serverConfig.cloudinaryApiKey,
    publicId,
    tag,
    context,
    timestamp,
    signature,
  };
}

export async function listPhotos(
  pageSize: number,
  pageToken?: string,
): Promise<{ photos: Photo[]; nextPageToken: string | null }> {
  try {
    const response = await client().api.resources_by_tag(
      serverConfig.cloudinaryTag,
      {
        resource_type: "image",
        type: "upload",
        max_results: pageSize,
        next_cursor: pageToken,
        direction: "desc",
        context: true,
      },
    );
    const assets = (response.resources ?? []) as CloudinaryAsset[];
    return {
      photos: assets.map(toPhoto),
      nextPageToken: response.next_cursor ?? null,
    };
  } catch (err: any) {
    console.dir(err, { depth: 6 });
    throw new CloudinaryApiError(
      "Could not list wedding photos from Cloudinary.",
      err instanceof Error ? err.message : String(err),
    );
  }
}

async function getVerifiedAsset(
  publicId: string,
): Promise<CloudinaryAsset | null> {
  try {
    const asset = (await client().api.resource(publicId, {
      resource_type: "image",
      type: "upload",
      tags: true,
      context: true,
    })) as CloudinaryAsset;
    return asset.tags?.includes(serverConfig.cloudinaryTag) ? asset : null;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    if (/not found/i.test(detail)) return null;
    throw new CloudinaryApiError(
      "Could not read the Cloudinary photo.",
      detail,
    );
  }
}

export async function getPreviewResponse(
  publicId: string,
  variant: "thumb" | "large",
): Promise<{ body: ReadableStream<Uint8Array>; contentType: string } | null> {
  const asset = await getVerifiedAsset(publicId);
  if (!asset) return null;
  const width = variant === "large" ? 1920 : 640;
  const url = client().url(publicId, {
    resource_type: "image",
    type: "upload",
    secure: true,
    transformation: [
      { width, crop: "limit", fetch_format: "auto", quality: "auto" },
    ],
  });
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new CloudinaryApiError(
      "Could not deliver the Cloudinary preview.",
      String(response.status),
    );
  }
  return {
    body: response.body,
    contentType: response.headers.get("Content-Type") ?? mimeType(asset.format),
  };
}

export async function getDownloadResponse(publicId: string): Promise<{
  body: ReadableStream<Uint8Array>;
  contentType: string;
  name: string;
} | null> {
  const asset = await getVerifiedAsset(publicId);
  if (!asset) return null;
  const response = await fetch(
    client().url(publicId, {
      resource_type: "image",
      type: "upload",
      secure: true,
    }),
  );
  if (!response.ok || !response.body) {
    throw new CloudinaryApiError(
      "Could not download the Cloudinary photo.",
      String(response.status),
    );
  }
  return {
    body: response.body,
    contentType: response.headers.get("Content-Type") ?? mimeType(asset.format),
    name: readFileName(asset) || "wedding-photo",
  };
}
