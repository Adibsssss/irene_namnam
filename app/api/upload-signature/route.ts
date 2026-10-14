import { NextRequest, NextResponse } from "next/server";
import { createUploadSignature } from "@/lib/cloudinary";
import { sanitizeFileName, validateUploadRequest } from "@/lib/validation";
import type { ApiErrorBody } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let input: { fileName?: unknown; mimeType?: unknown; fileSize?: unknown };
  try {
    input = await req.json();
  } catch {
    return NextResponse.json<ApiErrorBody>({ error: "Invalid upload request." }, { status: 400 });
  }

  const validation = validateUploadRequest(input);
  if (!validation.ok) {
    return NextResponse.json<ApiErrorBody>(
      { error: validation.error ?? "Invalid upload request." },
      { status: 400 },
    );
  }

  return NextResponse.json(createUploadSignature(sanitizeFileName(input.fileName as string)), {
    headers: { "Cache-Control": "no-store" },
  });
}
