# Repository guidance

This is a mobile-first, no-login wedding photo gallery. Guests upload from a
phone, browse a shared gallery, and save original photos. Cloudinary stores
the images and metadata; Next.js API routes keep Cloudinary credentials on the
server.

## Storage design

The browser requests `POST /api/upload-signature`; the route validates file
metadata then returns a short-lived signed Cloudinary upload. The browser
sends the original photo bytes directly to Cloudinary. Every asset receives a
random public ID and the configured `CLOUDINARY_TAG`; the tag isolates a
single event's gallery.

`/api/gallery` lists assets with that tag. `/api/image/[fileId]` and
`/api/download/[fileId]` verify the tag through Cloudinary before returning a
preview or original. Do not expose `CLOUDINARY_API_SECRET`, a signed-upload
signature, or any `lib/` module to a Client Component.

## Constraints

- Do not prefix Cloudinary secrets with `NEXT_PUBLIC_`.
- Preserve original uploads; do not add browser-side compression or resizing.
- Keep the 100 MB cap enforced in `lib/validation.ts` and the upload-signature
  request. Cloudinary account limits remain the final server-side backstop.
- The gallery has no guest login. It is suitable for a private, unlisted event
  link, not a confidential album.

## Validation

Run `npx tsc --noEmit` after TypeScript changes. Run `npm run build` when the
environment allows Next.js to create its `.next` build output. For storage
changes, manually upload a photo and verify the gallery, preview, and download
paths against Cloudinary.
