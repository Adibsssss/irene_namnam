import { NextRequest, NextResponse } from 'next/server';
import { serverConfig } from '@/lib/config';
import { DriveApiError, listPhotos } from '@/lib/google-drive';
import type { ApiErrorBody, GalleryResponse } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pageToken = searchParams.get('pageToken') ?? undefined;
  const rawPageSize = Number(searchParams.get('pageSize'));
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize > 0
      ? Math.min(rawPageSize, 100)
      : serverConfig.galleryPageSize;

  try {
    const { photos, nextPageToken } = await listPhotos(pageSize, pageToken);
    return NextResponse.json<GalleryResponse>(
      { photos, nextPageToken },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    if (err instanceof DriveApiError) {
      console.error('gallery Drive error:', err.message, err.detail);
    } else {
      console.error('gallery unexpected error:', err);
    }
    return NextResponse.json<ApiErrorBody>({ error: 'Could not load the gallery.' }, { status: 502 });
  }
}
