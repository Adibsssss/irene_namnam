"use client";

function StepIcon({ variant }: { variant: "add" | "upload" | "view" }) {
  if (variant === "add") {
    return (
      <svg viewBox="0 0 64 64" className="h-12 w-12 flex-none" aria-hidden>
        <rect x="8" y="16" width="44" height="34" rx="6" fill="#c7e3f8" />
        <circle cx="22" cy="30" r="5" fill="#f6f9ff" />
        <path
          d="M10 44l12-12 8 8 10-14 12 18"
          fill="none"
          stroke="#1b2a52"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="48" cy="14" r="9" fill="#1b2a52" />
        <path
          d="M48 10v8M44 14h8"
          stroke="#f6f9ff"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (variant === "upload") {
    return (
      <svg viewBox="0 0 64 64" className="h-12 w-12 flex-none" aria-hidden>
        <rect x="8" y="34" width="48" height="20" rx="6" fill="#8fc3ec" />
        <path
          d="M32 10v26M22 26l10-10 10 10"
          fill="none"
          stroke="#1b2a52"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" className="h-12 w-12 flex-none" aria-hidden>
      <rect x="8" y="10" width="20" height="20" rx="4" fill="#c7e3f8" />
      <rect x="36" y="10" width="20" height="20" rx="4" fill="#8fc3ec" />
      <rect x="8" y="36" width="20" height="20" rx="4" fill="#f0c4bc" />
      <rect x="36" y="36" width="20" height="20" rx="4" fill="#c7e3f8" />
      <path d="M32 46c-4-4-9-4-9 1s9 9 9 9 9-4 9-9-5-5-9-1z" fill="#d9a63e" />
    </svg>
  );
}

const steps = [
  {
    variant: "add" as const,
    title: "Add your photos",
    description:
      'Tap "Add your photos" at the bottom of the screen, then choose pictures already on your phone or take a new one right here.',
  },
  {
    variant: "upload" as const,
    title: "They upload automatically",
    description:
      "Keep this page open for a moment while it sends — the original, full-quality photo goes straight into the shared album.",
  },
  {
    variant: "view" as const,
    title: "See everyone\u2019s memories",
    description:
      "Every guest\u2019s photos land in the gallery below within a few seconds. Tap any photo to view it full-screen or save it.",
  },
];

export function HowItWorks() {
  return (
    <section
      className="mx-auto max-w-6xl px-4 pt-10 sm:px-6"
      aria-labelledby="how-it-works-title"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-coral">
        Getting started
      </p>
      <h2
        id="how-it-works-title"
        className="mt-1 font-display text-2xl text-ink sm:text-3xl"
      >
        How to add to the book
      </h2>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {steps.map((step, i) => (
          <div
            key={step.title}
            className="rounded-2xl border border-line/60 bg-white/40 p-4"
          >
            <div className="flex items-center gap-3">
              <StepIcon variant={step.variant} />
              <span className="text-[11px] font-bold text-muted">
                Step {i + 1}
              </span>
            </div>
            <h3 className="mt-3 font-display text-lg text-ink">{step.title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
