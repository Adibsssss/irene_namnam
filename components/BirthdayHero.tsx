"use client";

/**
 * The section's aspect ratio is locked to the artwork's own aspect ratio
 * (2400x1792, ~4:3). That's the key fix: previously the section's height
 * was driven purely by its content (photo + headline + paragraph), so on
 * a narrow phone it ended up much taller and skinnier than the artwork
 * was drawn for -- forcing `object-cover` to crop away most of the left
 * and right balloon columns just to fill that shape. Locking the aspect
 * ratio means the card is always proportioned like the artwork itself, on
 * any phone width, so the same amount of balloon shows every time (this
 * is why the wide-screenshot version looked right: at that width the
 * section's natural aspect ratio happened to already be close to 4:3).
 *
 * Content sizing below (photo/headline/paragraph) is tuned to fit inside
 * that aspect-locked height at common phone widths (~360-430px). If a
 * device renders the headline on three lines instead of two, the box will
 * grow slightly taller than the strict ratio (CSS aspect-ratio yields to
 * content rather than clipping it) -- a small amount of extra side-crop
 * in that edge case, not breakage.
 */

export function BirthdayHero() {
  return (
    <section className="relative aspect-[4/3] w-full overflow-hidden rounded-[2rem] bg-paper">
      <img
        src="/party-frame.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />

      <div className="relative z-10 flex h-full flex-col items-center px-6 pt-4 text-center sm:pt-6">
        <div className="polaroid-frame relative -mt-2 w-[36%] max-w-[170px] rotate-2 rounded-sm sm:w-[30%] sm:max-w-[210px]">
          <span
            aria-hidden
            className="absolute -top-2 left-1/2 h-3.5 w-9 -translate-x-1/2 -rotate-2 rounded-[1px] bg-butter/80 shadow-sm sm:-top-2.5 sm:h-4 sm:w-12"
          />
          <div className="aspect-square w-full overflow-hidden rounded-[2px] bg-line/40">
            <img
              src="/hero-baby.jpg"
              alt="Kai"
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        <h1 className="mt-3 max-w-[16rem] font-display text-[1.55rem] leading-[1.08] text-ink sm:mt-5 sm:max-w-md sm:text-4xl">
          A little book of blessings and birthday joy.
        </h1>

        <p className="mt-2 max-w-[15rem] text-[12px] italic leading-relaxed text-muted sm:mt-4 sm:max-w-sm sm:text-base">
          Drop in your favorite snapshots so we can hold onto every blessing,
          laugh, and candle.
        </p>
      </div>
    </section>
  );
}
