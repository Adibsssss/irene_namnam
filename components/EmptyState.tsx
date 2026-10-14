export function EmptyState() {
  return (
    <div className="corkboard-texture flex flex-col items-center rounded-[1.75rem] border border-line/70 bg-paper/40 px-6 py-16 text-center">
      <div className="flex items-end gap-4" aria-hidden>
        <span className="relative -rotate-3 rounded-sm border-2 border-dashed border-muted/30 bg-transparent px-7 py-9">
          <span className="absolute -top-2 left-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-coral shadow-sm" />
        </span>
        <span className="relative rotate-2 rounded-sm border-2 border-dashed border-muted/30 bg-transparent px-8 py-11">
          <span className="absolute -top-2 left-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-rose shadow-sm" />
        </span>
      </div>
      <p className="mt-7 font-display text-2xl text-ink">
        The board is still bare.
      </p>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">
        Add a favorite photo and be the first pin on Kai&apos;s dedication &amp;
        birthday board.
      </p>
    </div>
  );
}
