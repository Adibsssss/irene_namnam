"use client";

import { useState } from "react";

/**
 * Aspect ratio is locked to the frame artwork (public/wedding-frame.svg,
 * 4:3) so the sage-leaf corners look the same on every phone width.
 *
 * To show your own photo, drop a square-ish image at
 * public/hero-couple.jpg. Until it exists, a monogram is shown instead.
 */
export function WeddingHero() {
  const [photoFailed, setPhotoFailed] = useState(false);

  return (
    <section className="relative min-h-[31rem] w-full overflow-hidden rounded-[2rem] border border-white/70 bg-paper shadow-[0_20px_55px_rgba(47,61,47,0.1)] sm:min-h-[35rem] lg:min-h-[30rem] lg:rounded-[2.5rem]">
      <img
        src="/wedding-frame.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-90"
      />

      <div className="relative z-10 mx-auto flex min-h-[31rem] max-w-5xl flex-col items-center justify-center gap-5 px-6 py-9 text-center sm:min-h-[35rem] sm:gap-6 sm:px-10 lg:min-h-[30rem] lg:flex-row lg:justify-between lg:gap-12 lg:px-14 lg:py-10 lg:text-left xl:px-20">
        <div className="order-2 max-w-md lg:order-1 lg:max-w-[28rem]">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-coral sm:text-xs lg:text-sm">
            The wedding of
          </p>
          <h1 className="mt-2 font-display text-[2.45rem] leading-[0.96] text-ink sm:text-6xl lg:text-7xl xl:text-[5.25rem]">
            Nam-Nam <span className="italic text-coral">&amp;</span> Irish
          </h1>

          <div className="mx-auto mt-5 h-px w-12 bg-coral/50 lg:mx-0 lg:mt-6" />
          <p className="mx-auto mt-5 max-w-[18rem] text-sm italic leading-relaxed text-muted sm:max-w-sm sm:text-base lg:mx-0 lg:mt-6 lg:max-w-md lg:text-lg">
            Drop in your favorite snapshots so we can keep every smile, tear, and
            toast from our day.
          </p>
        </div>

        <div className="polaroid-frame relative order-1 w-[55%] max-w-[235px] rotate-2 rounded-sm sm:w-[48%] sm:max-w-[290px] lg:order-2 lg:w-[40%] lg:max-w-[330px] xl:max-w-[350px]">
          <span
            aria-hidden
            className="absolute -top-2.5 left-1/2 h-4 w-12 -translate-x-1/2 -rotate-2 rounded-[1px] bg-butter/80 shadow-sm sm:-top-3 sm:h-5 sm:w-14"
          />
          <div className="aspect-[0.78] w-full overflow-hidden rounded-[2px] bg-line/40">
            {photoFailed ? (
              <div className="flex h-full w-full items-center justify-center bg-sage/30 font-display text-4xl italic text-ink sm:text-5xl">
                N &amp; I
              </div>
            ) : (
              <img
                src="/irene-namnam.jpg"
                alt="Nam-Nam and Irish"
                onError={() => setPhotoFailed(true)}
                className="h-full w-full object-cover"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
