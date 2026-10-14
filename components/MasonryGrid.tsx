"use client";

import { useEffect, useState } from "react";
import type { Photo } from "@/types";
import { PhotoCard } from "./PhotoCard";

interface MasonryGridProps {
  photos: Photo[];
  newIds: Set<string>;
  onOpen: (index: number) => void;
}

function useColumnCount(): number {
  const [columns, setColumns] = useState(2);
  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      if (w >= 1024)
        setColumns(4); // lg
      else if (w >= 640)
        setColumns(3); // sm
      else setColumns(2);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return columns;
}

/**
 * A manually-computed masonry layout: each photo is assigned to whichever
 * column currently has the least estimated height, using its known
 * width/height ratio. This deliberately replaces the earlier CSS
 * `columns-N` approach.
 *
 * CSS multi-column masonry has a real, unfixable-in-CSS limitation: the
 * browser first estimates a target column height, then places items and
 * breaks to the next column when one fills up. `break-inside: avoid` is
 * only a hint within that process — with variable-height items (and this
 * gallery prepending new photos on every poll, which forces re-balancing),
 * browsers can still slice a single image's rendered box across the
 * column boundary rather than growing the column. That's what caused the
 * "top of a photo at the bottom of one column, bottom of the same photo
 * at the top of the next" bug.
 *
 * Assigning photos to columns ourselves sidesteps the problem entirely:
 * each column is just a plain flex container holding whole DOM nodes, so
 * there's no column-balancing algorithm left that could split one.
 */
export function MasonryGrid({ photos, newIds, onOpen }: MasonryGridProps) {
  const columnCount = useColumnCount();

  const columns: { photo: Photo; index: number }[][] = Array.from(
    { length: columnCount },
    () => [],
  );

  // Distribute items evenly across columns by index to prevent height-estimation drift
  photos.forEach((photo, index) => {
    const targetCol = index % columnCount;
    columns[targetCol]!.push({ photo, index });
  });

  return (
    <div className="corkboard-texture flex gap-4 rounded-[1.75rem] px-3 pb-2 pt-4 sm:gap-5 sm:px-4">
      {columns.map((columnItems, colIndex) => (
        <div key={colIndex} className="flex flex-1 flex-col gap-4 sm:gap-5">
          {columnItems.map(({ photo, index }) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              onOpen={() => onOpen(index)}
              isNew={newIds.has(photo.id)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
