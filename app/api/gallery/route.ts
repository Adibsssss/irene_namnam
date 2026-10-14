import { NextRequest, NextResponse } from "next/server";
import { serverConfig } from "@/lib/config";
import { CloudinaryApiError, listPhotos } from "@/lib/cloudinary";
import type { ApiErrorBody, GalleryResponse } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pageToken = searchParams.get("pageToken") ?? undefined;
  const rawPageSize = Number(searchParams.get("pageSize"));
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize > 0
      ? Math.min(rawPageSize, 100)
      : serverConfig.galleryPageSize;

  try {
    const { photos, nextPageToken } = await listPhotos(pageSize, pageToken);
    return NextResponse.json<GalleryResponse>(
      { photos, nextPageToken },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err: any) {
    // Cloudinary SDK rejects with plain objects, not Error instances:
    // usually { error: { message, http_code } } or { message, http_code }
    const raw = err?.error ?? err;
    const detail =
      typeof raw === "string"
        ? raw
        : JSON.stringify(raw, Object.getOwnPropertyNames(raw ?? {}), 2);
    throw new CloudinaryApiError(
      "Could not list wedding photos from Cloudinary.",
      detail,
    );
  }
}
