"use client";

import { useState, type CSSProperties } from "react";
import type { Photo } from "@/types";

interface PhotoCardProps {
  photo: Photo;
  onOpen: () => void;
  /** True for a few seconds right after a photo lands, so it stands out from the rest of the board. */
  isNew?: boolean;
}

/** Deterministic -2.4..2.4deg tilt from the photo id, so cards don't jitter between renders but the grid still reads as loosely scattered rather than machine-aligned. */
function tiltForId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  const normalized = (Math.abs(hash) % 100) / 100; // 0..1
  return (normalized - 0.5) * 4.8; // -2.4..2.4
}

/** Alternates between a strip of "washi tape" and a round pin, keyed off the same hash so it's stable per photo. */
function accentForId(id: string): "tape" | "pin" {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 17 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 2 === 0 ? "tape" : "pin";
}

export function PhotoCard({ photo, onOpen, isNew = false }: PhotoCardProps) {
  const [loaded, setLoaded] = useState(false);
  const ratio = photo.width && photo.height ? photo.width / photo.height : 1;
  const tilt = tiltForId(photo.id);
  const accent = accentForId(photo.id);

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{ "--tilt": `${tilt}deg` } as CSSProperties}
      className={`group relative block w-full rounded-sm polaroid-frame rotate-[var(--tilt)] transition-transform duration-300 hover:z-10 hover:rotate-0 hover:-translate-y-1 ${
        isNew ? "animate-glow-pulse" : ""
      }`}
      aria-label="Open photo"
    >
      {accent === "tape" ? (
        <span
          aria-hidden
          className="absolute -top-2.5 left-1/2 h-5 w-14 -translate-x-1/2 -rotate-2 rounded-[1px] bg-butter/80 shadow-sm"
        />
      ) : (
        <span
          aria-hidden
          className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-coral shadow-[0_2px_4px_rgba(30,42,120,0.35)]"
        >
          <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60" />
        </span>
      )}

      <div
        className="w-full overflow-hidden rounded-[2px] bg-line/40 [-webkit-mask-image:-webkit-radial-gradient(white,black)]"
        style={{ aspectRatio: ratio }}
      >
        <img
          src={`/api/image/${photo.id}?variant=thumb`}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={`h-full w-full object-cover transition duration-500 group-hover:scale-[1.035] ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>
    </button>
  );
}
