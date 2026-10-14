# Nam-Nam & Irish Wedding Gallery

A mobile-first, no-login wedding photo gallery. Guests upload photos from a
phone, browse the shared album, and save original images. Media is stored in
Cloudinary; the browser never receives Cloudinary API credentials.

## Cloudinary setup

1. Create a Cloudinary product environment.
2. In **Console > Settings > API Keys**, copy the cloud name, API key, and API
   secret.
3. Copy `.env.local.example` to `.env.local` and set:

   ```dotenv
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   CLOUDINARY_TAG=namnam-irish-wedding
   ```

`CLOUDINARY_TAG` isolates this gallery's photos. Use a distinct tag for every
event gallery that shares the same Cloudinary environment.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and upload a photo. The server validates the
file metadata and issues a short-lived upload signature; the photo bytes go
directly to Cloudinary, avoiding Vercel request-size limits. Thumbnails use
Cloudinary's automatic format and quality delivery.

## Deployment

This project is configured for Render via `render.yaml`.

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. In Render, choose **New > Blueprint** and select the repository. Render
   reads `render.yaml` and creates the web service with the correct build,
   start, and health-check settings.
3. Before the first deploy, enter values for the three secret variables in
   Render's environment settings:

   ```text
   CLOUDINARY_CLOUD_NAME
   CLOUDINARY_API_KEY
   CLOUDINARY_API_SECRET
   ```

   The blueprint supplies safe defaults for the gallery tag and optional
   tuning variables. Change `CLOUDINARY_TAG` if this Cloudinary environment is
   shared with another event.
4. Deploy. Render checks `GET /api/health`; a successful response is
   `{ "status": "ok" }`.

If you create the service manually instead of using the Blueprint, use:

```text
Runtime: Node
Build command: npm ci && npm run build
Start command: npm run start
Health check path: /api/health
```

Do not commit `.env.local` or enter `CLOUDINARY_API_SECRET` in any
`NEXT_PUBLIC_*` variable.

## Privacy and moderation

This gallery intentionally has no guest login, so anyone with the gallery URL
can upload photos. Keep the deployment URL private for an invite-only event.
Cloudinary delivery URLs are publicly retrievable if discovered; use
Cloudinary's authenticated delivery and add app-level guest authentication if
the album must be private.
