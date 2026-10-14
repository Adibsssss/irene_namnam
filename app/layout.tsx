import type { Metadata, Viewport } from "next";
// Self-hosted via npm instead of next/font/google: the font files ship
// inside these packages and get bundled at build time, so npm run dev /
// npm run build never needs to reach fonts.googleapis.com. This matters
// because some networks (corporate VPNs, SSL-inspecting antivirus) let a
// browser reach Google Fonts fine while silently stalling Node's own
// outbound fetch — which shows up as `next dev` hanging forever right
// after "✓ Starting..." with no error at all.
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/playfair-display";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kai’s Dedication & Birthday Gallery",
  description:
    "Celebrate Kai's dedication and birthday with every photo from the day.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f9ff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-paper font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
