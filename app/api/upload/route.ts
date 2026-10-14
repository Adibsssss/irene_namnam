import { NextRequest, NextResponse } from 'next/server';
import { serverConfig } from '@/lib/config';
import { DriveApiError, uploadOriginalStream } from '@/lib/google-drive';
import { sanitizeFileName, validateUploadRequest } from '@/lib/validation';
import type { ApiErrorBody } from '@/types';

export const runtime = 'nodejs';

/**
 * A safety net independent of the client-declared X-File-Size header: even
 * if that header understates the true size, the upload is hard-stopped the
 * moment actual bytes exceed the configured cap, so a misbehaving client
 * can never stream an unbounded file into Drive.
 */
function createSizeLimitStream(maxBytes: number): TransformStream<Uint8Array, Uint8Array> {
  let seen = 0;
  return new TransformStream({
    transform(chunk, controller) {
      seen += chunk.byteLength;
      if (seen > maxBytes) {
        controller.error(new Error('The file exceeds the allowed size.'));
        return;
      }
      controller.enqueue(chunk);
    },
  });
}

export async function POST(req: NextRequest) {
  const mimeType = req.headers.get('content-type') ?? '';
  const fileSize = Number(req.headers.get('x-file-size'));
  const rawName = req.headers.get('x-file-name') ?? '';

  let fileName = rawName;
  try {
    fileName = decodeURIComponent(rawName);
  } catch {
    // Fall back to the raw header value if it wasn't actually encoded.
  }

  const validation = validateUploadRequest({ fileName, mimeType, fileSize });
  if (!validation.ok) {
    return NextResponse.json<ApiErrorBody>({ error: validation.error ?? 'Invalid request.' }, { status: 400 });
  }

  if (!req.body) {
    return NextResponse.json<ApiErrorBody>({ error: 'No file data was received.' }, { status: 400 });
  }

  const safeName = sanitizeFileName(fileName);
  const limitedBody = req.body.pipeThrough(createSizeLimitStream(serverConfig.maxFileSizeBytes));

  try {
    const file = await uploadOriginalStream({
      fileName: safeName,
      mimeType,
      fileSize,
      body: limitedBody,
    });
    return NextResponse.json({ id: file.id, name: file.name, mimeType: file.mimeType });
  } catch (err) {
    if (err instanceof DriveApiError) {
      console.error('upload Drive error:', err.message, err.detail);
      return NextResponse.json<ApiErrorBody>(
        { error: 'Could not upload the photo. Please try again.' },
        { status: 502 }
      );
    }
    // Includes the size-limit stream's error and any interrupted-connection
    // errors surfaced while piping the body through to Drive.
    console.error('upload unexpected error:', err);
    return NextResponse.json<ApiErrorBody>(
      { error: 'The upload was interrupted. Please try again.' },
      { status: 500 }
    );
  }
}
