"use client";

import { useEffect, useRef, useState } from "react";
import type { Photo } from "@/types";
import { MasonryGrid } from "./MasonryGrid";
import { PhotoCard } from "./PhotoCard";
import { Lightbox } from "./Lightbox";
import { EmptyState } from "./EmptyState";

interface GalleryProps {
  photos: Photo[];
  status: "loading" | "ready" | "error";
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

// Varied heights so the loading state already reads as a masonry grid
// rather than a flat block of identical squares.
const SKELETON_HEIGHTS = [210, 280, 170, 240, 200, 260, 190, 230];

// How long a newly-landed photo keeps its "just pinned" glow.
const NEW_PHOTO_GLOW_MS = 2600;

export function Gallery({
  photos,
  status,
  hasMore,
  loadingMore,
  onLoadMore,
}: GalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const hasLoadedOnce = useRef(false);
  const knownIds = useRef<Set<string>>(new Set());

  // Marks any id that appears for the first time *after* the initial load
  // as "new" for a few seconds, so a photo landing via polling or an
  // optimistic upload visibly stands out from the rest of the board —
  // without the whole gallery glowing together on first paint.
  useEffect(() => {
    const currentIds = new Set(photos.map((p) => p.id));

    if (hasLoadedOnce.current) {
      const fresh = photos
        .filter((p) => !knownIds.current.has(p.id))
        .map((p) => p.id);
      if (fresh.length > 0) {
        setNewIds((prev) => new Set([...prev, ...fresh]));
        const timer = setTimeout(() => {
          setNewIds((prev) => {
            const next = new Set(prev);
            fresh.forEach((id) => next.delete(id));
            return next;
          });
        }, NEW_PHOTO_GLOW_MS);
        knownIds.current = currentIds;
        return () => clearTimeout(timer);
      }
    }

    if (photos.length > 0) hasLoadedOnce.current = true;
    knownIds.current = currentIds;
  }, [photos]);

  if (status === "loading") {
    return (
      <div className="columns-2 gap-3 rounded-[1.75rem] px-3 pt-4 sm:columns-3 sm:gap-4 sm:px-4 lg:columns-4">
        {SKELETON_HEIGHTS.map((height, i) => (
          <div
            key={i}
            className="mb-3 w-full animate-shimmer rounded-sm bg-line/40 bg-[length:200%_100%] bg-gradient-to-r from-line/30 via-white/70 to-line/30 sm:mb-4"
            style={{ height }}
          />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="px-6 py-20 text-center">
        <p className="text-[15px] text-ink">
          The gallery couldn&rsquo;t be loaded.
        </p>
        <p className="mt-1 text-[13px] text-muted">
          Check your connection and reopen the page.
        </p>
      </div>
    );
  }

  if (photos.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="pb-4">
      <MasonryGrid photos={photos} newIds={newIds} onOpen={setOpenIndex} />

      {hasMore && (
        <div className="mt-2 flex justify-center px-4">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="rounded-full border border-line bg-paper px-5 py-2.5 text-[13px] font-medium text-ink transition-colors duration-150 active:bg-line/40 disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      {openIndex !== null && photos[openIndex] && (
        <Lightbox
          photos={photos}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onNavigate={setOpenIndex}
        />
      )}
    </div>
  );
}
