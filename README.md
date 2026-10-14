# Event Gallery

A mobile-first, no-login photo gallery for a one-day event. Guests scan a QR
code, land on the gallery, and can add photos from their library or camera.
Everything anyone uploads shows up for everyone else within a few seconds.

Storage is Google Drive — no database. Hosting is Railway, running as a
single Next.js app with no separate backend.

```
Guest phone → Next.js app on Railway → Google Drive
```

- **Uploading**: the phone sends the raw photo bytes to `POST /api/upload`
  on our own server. That route streams the bytes straight through to a
  Google Drive resumable upload session as they arrive — nothing is
  buffered in memory, and nothing about Google or Drive is ever visible to
  the browser.
- **Browsing**: `GET /api/gallery` returns pages of photo metadata (id,
  name, dimensions, upload time) read from the one configured Drive folder.
- **Previews**: the gallery grid and the lightbox both load images through
  `GET /api/image/[fileId]`, which serves Google's own generated thumbnail
  at an appropriate size — never the full original — so browsing never
  pulls multi-megabyte files over the guest's mobile connection.
- **Saving**: the explicit "Save photo" action calls
  `GET /api/download/[fileId]`, which streams back the untouched original
  file, with the real filename, for the browser (or share sheet) to save.

## Limitations worth knowing about

**Railway's 5-minute request window.** Railway's public network enforces a
[5-minute maximum duration](https://docs.railway.com/reference/public-networking#technical-specifications)
on any single HTTP request. A 100 MB photo comfortably finishes well inside
that window on Wi-Fi or 4G/5G — a 100 MB file needs roughly 2 Mbps sustained
to finish in 5 minutes, and typical phone photos are 3–25 MB. But on a very
poor connection (e.g. one bar of 3G), a large file can genuinely time out
before it finishes. **The 100 MB cap is a practical application limit, not a
guarantee that every 100 MB file uploads successfully on every connection.**
The client sets its own timeout a little under Railway's limit so a slow
upload fails with a clear "timed out" message and a retry button, rather
than hanging indefinitely or surfacing a confusing generic network error.
The same request-duration ceiling applies symmetrically to downloads, so
saving a very large original on a very slow connection carries the same
small risk — the fix in both directions is the same retry affordance.

**Drive thumbnails aren't instant.** Google generates a file's thumbnail
asynchronously after upload; for the first handful of seconds after a photo
lands, `/api/image` transparently falls back to serving the full original
until Drive's thumbnail exists, then switches over automatically on the
next request. You may see one slightly slower load for the very newest
photo.

**HEIC photos and in-app viewing.** iPhones often capture photos as HEIC,
which most non-Safari mobile browsers can't render directly. Google Drive's
generated thumbnail is always a JPEG regardless of the source format, so
the gallery grid and lightbox preview work everywhere. Only the explicit
"Save photo" action ever touches the real HEIC bytes, and that's by design
— it's the one place the *original* format actually matters.

**Saving to the camera roll isn't fully automatic everywhere.** No mobile
browser can silently write a file to the photo library without some form of
user interaction. "Save photo" uses the Web Share API where the browser
supports sharing files (this covers iOS Safari, where it opens the native
share sheet with a "Save Image" option); elsewhere it falls back to a
standard browser download. Either way, saving takes one extra tap on some
platforms — there's no way around that from a web app.

**Polling, not push.** The gallery re-checks for new photos every 7 seconds
while the tab is visible (and immediately when the tab regains focus). This
is simple and reliable, but on the extremely unlikely chance that more than
a page's worth of new photos (~20) lands between two polls, only the newest
page is inspected on that cycle — the rest appear on the very next poll a
few seconds later.

**Why the server streams the upload instead of the browser talking to
Google directly.** An earlier, Vercel-oriented version of this app had the
browser upload directly to a Google Drive resumable-session URL, because
Vercel serverless functions cap request bodies at 4.5 MB — far below an
original phone photo. Railway has no such body-size limit (only the
request-duration ceiling above), so the simpler and more secure design is
back on the table: everything goes through our own server, Google
credentials and Drive URLs never reach the browser, and there's no CORS
configuration to get right.

## Project structure

```
event-gallery/
├── app/
│   ├── layout.tsx                  Root HTML shell, font, viewport/meta
│   ├── page.tsx                    Home page: wires up all the hooks/components
│   ├── globals.css                 Tailwind entry point + small base rules
│   └── api/
│       ├── upload/route.ts         POST — streams a photo through to Drive
│       ├── gallery/route.ts        GET  — paginated photo metadata
│       ├── image/[fileId]/route.ts GET  — thumbnail or large preview proxy
│       ├── download/[fileId]/route.ts GET — original file, as an attachment
│       └── health/route.ts         GET  — Railway healthcheck target
├── components/
│   ├── Onboarding.tsx              First-visit explainer sheet
│   ├── UploadButton.tsx            Sticky control + choose-source menu
│   ├── UploadProgress.tsx          "Uploading 2 of 5 — 64%" tray + retries
│   ├── Gallery.tsx                 Loading/empty/error states, pagination
│   ├── MasonryGrid.tsx             CSS-columns masonry container
│   ├── PhotoCard.tsx               One gallery thumbnail
│   ├── Lightbox.tsx                Full-screen viewer, gestures, save action
│   └── EmptyState.tsx              "No photos yet"
├── hooks/
│   ├── useOnboarding.ts            localStorage-backed dismiss state
│   ├── useGalleryPolling.ts        Initial load, "load more", 7s polling
│   └── useUpload.ts                Upload queue, concurrency, progress, retry
├── lib/
│   ├── config.ts                   Server-only env var access
│   ├── google-drive.ts             Server-only Drive REST calls (auth, list, stream upload, previews)
│   └── validation.ts               Server-only request validation
├── types/index.ts                  Shared TypeScript types
├── railway.json                    Optional: explicit healthcheck/restart config
├── next.config.js
├── tailwind.config.ts
└── .env.local.example
```

`lib/` files are annotated server-only and must never be imported from a
Client Component — they're the only place the service account key is read.

## 1. Google Cloud / Google Drive setup

1. **Create or select a Google Cloud project** at
   [console.cloud.google.com](https://console.cloud.google.com/). Any
   project works; a dedicated one for the event is fine.
2. **Enable the Google Drive API**: in the console, go to *APIs & Services
   → Library*, search for "Google Drive API", and click **Enable**.
3. **Create a Service Account**: *APIs & Services → Credentials → Create
   Credentials → Service Account*. Give it any name (e.g.
   `event-gallery`). You don't need to grant it any project-level IAM
   roles — folder-level Drive access is handled separately in step 6.
4. **Create its key**: open the new service account → *Keys* tab → *Add
   Key → Create new key → JSON*. Save the downloaded file somewhere safe;
   you'll copy two fields out of it (`client_email`, `private_key`) and
   then you can delete the file.
5. **Create the event's Drive folder**: in your own Google Drive, create a
   new folder (e.g. "Sam's Birthday Photos").
6. **Share that folder with the service account**: right-click the folder
   → *Share* → paste the service account's email (the `client_email` field,
   looks like `event-gallery@your-project.iam.gserviceaccount.com`) → give
   it **Editor** access → Send/Share. This is the only permission the
   service account has anywhere — it can't see any other file in your
   Drive.
7. **Get the folder ID**: open the folder in Drive; the ID is the segment
   of the URL after `/folders/` —
   `https://drive.google.com/drive/folders/`**`1AbCdEfGhIjKlMnOpQrStUvWxYz`**.

## 2. Environment variables

| Variable | Purpose |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | The `client_email` field from the service account JSON key. |
| `GOOGLE_PRIVATE_KEY` | The `private_key` field from the same JSON key. See below for how to store it. |
| `GOOGLE_DRIVE_FOLDER_ID` | The event folder's ID from step 7 above. |
| `MAX_FILE_SIZE_MB` | Optional, defaults to `100`. Per-photo upload cap. |
| `GALLERY_PAGE_SIZE` | Optional, defaults to `20`. Photos per gallery page. |

None of these use the `NEXT_PUBLIC_` prefix, so none of them are ever sent
to the browser — Next.js only exposes `NEXT_PUBLIC_*` variables client-side.

**Storing the multiline private key.** Railway's variable editor genuinely
supports multiline values: open the *Raw Editor* for the service's
variables, or press **Ctrl+Enter** (**Cmd+Enter** on Mac) inside the value
field, and paste the key exactly as it appears in the JSON file — real line
breaks and all:

```
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQ...
-----END PRIVATE KEY-----
"
```

For local development, `.env.local` files are usually easier to edit with
the key on one line using literal `\n` sequences instead of real line
breaks — the app converts these back into real newlines at startup either
way, so both forms work in both places:

```
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQ...\n-----END PRIVATE KEY-----\n"
```

See `.env.local.example` for a template.

## 3. Local development

```bash
npm install
cp .env.local.example .env.local
# edit .env.local with your service account email, private key, and folder ID
npm run dev
```

Open `http://localhost:3000`, dismiss the onboarding sheet, and try
uploading a photo — it should appear in the gallery and also show up in the
Drive folder itself.

To test the production build locally before deploying:

```bash
npm run build
npm run start   # binds to $PORT if set, otherwise 3000
```

(The `start` script uses `${PORT:-3000}` shell syntax; on Windows, run
`next start -p 3000` directly instead.)

## 4. Deploying to Railway

1. **Push the project to a Git repository** (GitHub, GitLab, etc.) —
   Railway deploys from a repo.
2. **Create a Railway project**: at [railway.app](https://railway.app),
   click **New Project**.
3. **Connect the repository**: choose **Deploy from GitHub repo** and
   select this project. Railway detects it as a Node.js/Next.js app via
   Nixpacks automatically — no Dockerfile needed.
4. **Configure environment variables**: open the new service → *Variables*
   tab → add `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` (see the
   multiline note above), and `GOOGLE_DRIVE_FOLDER_ID`. Add
   `MAX_FILE_SIZE_MB`/`GALLERY_PAGE_SIZE` only if you want to override the
   defaults.
5. **Build/start commands**: no changes needed — Railway runs `npm run
   build` then `npm run start` automatically, matching the scripts already
   in `package.json`. The included `railway.json` makes this explicit and
   also points Railway's healthcheck at `/api/health`, but it's optional;
   Railway's zero-config detection works without it.
6. **Generate a public domain**: in the service's *Settings → Networking*
   tab, click **Generate Domain** (or attach a custom domain there if
   you'd rather point your own subdomain at it).
7. **Deploy**: Railway deploys automatically on push once the service is
   connected; you can also trigger a deploy manually from the dashboard.
   Watch the build/deploy logs for errors.
8. **Verify**: open the generated URL on your phone, go through onboarding,
   upload a photo from your library and one from the camera, and confirm
   both appear in the gallery within a few seconds.
9. **Confirm Drive is actually receiving files**: open the event's Drive
   folder in a browser — the uploaded originals should be there, at full
   size, matching what you uploaded (check file size/resolution against the
   source photo).
10. **Point the event's QR code at the deployment URL**: generate a QR code
    (any QR generator works) encoding the Railway-provided URL from step 6
    (or your custom domain). That's the code guests scan.

That's it — a single Railway service, no database, no separate backend, and
Google Drive as the permanent photo archive for the event.
