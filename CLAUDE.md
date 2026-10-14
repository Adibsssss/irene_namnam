# CLAUDE.md

Guidance for Claude (or any AI assistant) working in this repository. Read
this before making changes, especially to uploads, the Drive integration,
or anything under `lib/`.

## What this is

A mobile-first, no-login web app for one-day events (birthdays, etc.).
Guests scan a QR code, land on a live shared photo gallery, and can upload
from their library or camera. No accounts, no database — Google Drive is
the only storage and metadata layer. Hosted on Railway as a single Next.js
service with no separate backend.

```
Guest phone → Next.js API routes on Railway → Google Drive
```

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- `google-auth-library` for service-account auth — deliberately **not**
  the full `googleapis` package; Drive REST calls are made directly with
  `fetch` to keep the dependency footprint small.
- Railway for hosting (Nixpacks auto-detection, `next start`, no
  Dockerfile).

## How uploads actually work (read this before touching upload code)

The browser `POST`s the raw file body to `/api/upload` with the file's
name/size/type in headers (`X-File-Name`, `X-File-Size`, `Content-Type`).
`app/api/upload/route.ts` validates the request, then hands the incoming
request stream to `uploadOriginalStream()` in `lib/google-drive.ts`, which:

1. Opens a Drive **resumable upload session** (a tiny metadata-only
   request).
2. Pipes the request body straight through to that session's PUT endpoint
   with `duplex: 'half'`, so bytes are never buffered in memory
   server-side.

There is **no client-side request to Google** and no Drive URL is ever
sent to the browser. This is intentional: an earlier version of this app
targeted Vercel, whose serverless functions cap request bodies at 4.5 MB,
which forced the browser to upload directly to a Google-issued URL instead.
Railway has no such body-size cap (its limit is a 5-minute max *request
duration*, platform-wide), so the simpler, more secure, fully-server-side
design is correct here. **Do not reintroduce the direct-to-Google upload
flow** unless the hosting target changes back to something with a small
request-body limit.

## Hard constraints — do not violate these

- **Never** import `lib/google-drive.ts` or `lib/config.ts` from a Client
  Component (`'use client'`). They read the service account private key.
- **Never** prefix a secret with `NEXT_PUBLIC_`.
- **Do not** add client-side image compression, resizing, or re-encoding
  before upload. Storing untouched originals is an explicit product
  requirement, not an oversight.
- **Do not** introduce a database. Google Drive is the permanent,
  intentional storage layer.
- **Do not** introduce another storage provider (S3, Cloudinary, etc.)
  unless explicitly asked — Drive is the whole point of this app.
- Keep the **100 MB per-photo cap** enforced in two places in sync:
  `lib/validation.ts` (`validateUploadRequest`, trusts the client-declared
  size) and `app/api/upload/route.ts` (`createSizeLimitStream`, a
  byte-counting safety net independent of client-declared headers). If you
  change the limit, change `MAX_FILE_SIZE_MB` in `lib/config.ts`'s default
  and `.env.local.example` — both read from the same config value already,
  so this should be the only place to touch.
- Visual style is strictly black-on-white, fine-line borders/dividers,
  minimal shadows, minimal animation, no gradients, **no emojis anywhere in
  the UI**. Don't drift from this without being asked to.
- `/api/image/[fileId]` and `/api/download/[fileId]` both re-verify that
  the requested file's `parents` actually includes the configured Drive
  folder before serving it (see `getVerifiedFile` in `lib/google-drive.ts`).
  Don't remove that check — it's the only thing stopping an arbitrary Drive
  file ID from being fetchable if the service account ever gets access to
  more than one folder.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build — also type-checks |
| `npx tsc --noEmit` | Type-check only, faster than a full build |
| `npm run start` | Run the production build (binds `${PORT:-3000}`) |
| `npm run lint` | Next.js/ESLint |

## Before considering a change done

1. `npx tsc --noEmit` passes with zero errors.
2. `npm run build` completes without errors.
3. If you touched `lib/google-drive.ts`, `app/api/upload/route.ts`, or
   `hooks/useUpload.ts`, manually re-verify end to end: a photo actually
   lands in the configured Drive folder at full original size/quality, it
   appears in the gallery within one polling cycle (~7s), and the lightbox
   + download still work for it.

## File map

```
app/
  layout.tsx, page.tsx, globals.css   Shell, home page, Tailwind entry
  api/upload/route.ts                 POST — streams a photo through to Drive
  api/gallery/route.ts                GET  — paginated photo metadata
  api/image/[fileId]/route.ts         GET  — thumbnail/large preview proxy
  api/download/[fileId]/route.ts      GET  — original file, as attachment
  api/health/route.ts                 GET  — Railway healthcheck target
components/                           Onboarding, UploadButton, UploadProgress,
                                       Gallery, MasonryGrid, PhotoCard, Lightbox,
                                       EmptyState — all Client Components
hooks/
  useOnboarding.ts                    localStorage-backed dismiss state
  useGalleryPolling.ts                Initial load, "load more", 7s polling
  useUpload.ts                        Upload queue, concurrency, progress, retry
lib/                                  SERVER-ONLY
  config.ts                           Env var access, validated getters
  google-drive.ts                     All Drive REST calls (auth, list, stream
                                       upload, preview/download proxying)
  validation.ts                       Request validation, filename sanitizing
types/index.ts                        Shared types (Photo, GalleryResponse, etc.)
railway.json                          Optional explicit healthcheck/restart config
```

## Known platform limitations (design around these, don't fight them)

- Railway enforces a hard **5-minute max HTTP request duration** on public
  traffic. Don't build a feature that assumes a single request can run
  longer than that (e.g. server-side transcoding of a large file) — use an
  async/background pattern instead if that's ever needed.
- Google Drive's `thumbnailLink` is generated **asynchronously** after
  upload; it may not exist for the first few seconds. `getPreviewResponse`
  already falls back to the full original in that window — don't assume
  `thumbnailLink` is always present.
- Most mobile browsers can't render **HEIC** inline. Previews intentionally
  use Drive's auto-generated JPEG thumbnail for this reason; only the
  explicit download/save path touches real HEIC bytes.
- No mobile browser can silently write a file to the camera roll without
  some user interaction — `Lightbox.tsx`'s save action already branches on
  Web Share API support for this; don't "fix" the extra tap on iOS, it's
  not fixable from a web app.
