import { NextRequest, NextResponse } from 'next/server';
import { DriveApiError, getDownloadResponse } from '@/lib/google-drive';
import { isValidDriveFileId } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { fileId: string } }) {
  const { fileId } = params;
  if (!isValidDriveFileId(fileId)) {
    return NextResponse.json({ error: 'Photo not found.' }, { status: 404 });
  }

  try {
    const result = await getDownloadResponse(fileId);
    if (!result) {
      return NextResponse.json({ error: 'Photo not found.' }, { status: 404 });
    }
    // Strip characters that would break the header rather than reject
    // the whole download over a cosmetic file name issue.
    const safeName = result.name.replace(/["\r\n]/g, '');
    return new NextResponse(result.body, {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${safeName}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    if (err instanceof DriveApiError) {
      console.error('download Drive error:', err.message, err.detail);
    } else {
      console.error('download unexpected error:', err);
    }
    return NextResponse.json({ error: 'Could not download photo.' }, { status: 502 });
  }
}
