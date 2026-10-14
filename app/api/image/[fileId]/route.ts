import { NextRequest, NextResponse } from 'next/server';
import { DriveApiError, getPreviewResponse } from '@/lib/google-drive';
import { isValidDriveFileId } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { fileId: string } }) {
  const { fileId } = params;
  if (!isValidDriveFileId(fileId)) {
    return NextResponse.json({ error: 'Photo not found.' }, { status: 404 });
  }

  const variant = new URL(req.url).searchParams.get('variant') === 'large' ? 'large' : 'thumb';

  try {
    const result = await getPreviewResponse(fileId, variant);
    if (!result) {
      return NextResponse.json({ error: 'Photo not found.' }, { status: 404 });
    }
    return new NextResponse(result.body, {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        // A given file's content never changes, so this is safe to cache
        // fairly aggressively at the edge and in the browser.
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err) {
    if (err instanceof DriveApiError) {
      console.error('image proxy Drive error:', err.message, err.detail);
    } else {
      console.error('image proxy unexpected error:', err);
    }
    return NextResponse.json({ error: 'Could not load photo.' }, { status: 502 });
  }
}
