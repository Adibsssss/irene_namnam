"use client";

import { useEffect, useState } from "react";

interface OnboardingProps {
  open: boolean;
  onDismiss: () => void;
}

const STEPS = [
  { title: "Add your photos", detail: "Tap the button at the bottom." },
  {
    title: "Choose your favorites",
    detail: "Pick from your phone or take a new one.",
  },
  {
    title: "Enjoy the gallery",
    detail: "Your moments appear for everyone to see.",
  },
];
const TOTAL_DURATION_MS = 3000;

function StepIcon({ step }: { step: number }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (step === 0) {
    return (
      <svg viewBox="0 0 64 64" className="h-20 w-20 text-[#3979b7]" aria-hidden>
        <rect
          x="8"
          y="16"
          width="44"
          height="34"
          rx="6"
          className="fill-[#cfe8fb]"
        />
        <circle cx="22" cy="30" r="5" className="fill-paper" />
        <path d="M10 44l12-12 8 8 10-14 12 18" {...common} />
        <circle cx="48" cy="14" r="9" className="fill-[#5b9bd5]" />
        <path
          d="M48 10v8M44 14h8"
          stroke="#fff"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (step === 1) {
    return (
      <svg viewBox="0 0 64 64" className="h-20 w-20 text-[#3979b7]" aria-hidden>
        <rect
          x="8"
          y="34"
          width="48"
          height="20"
          rx="6"
          className="fill-butter"
        />
        <path d="M32 10v26M22 26l10-10 10 10" {...common} strokeWidth="3.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" className="h-20 w-20 text-[#3979b7]" aria-hidden>
      <rect
        x="8"
        y="10"
        width="20"
        height="20"
        rx="4"
        className="fill-[#cfe8fb]"
      />
      <rect
        x="36"
        y="10"
        width="20"
        height="20"
        rx="4"
        className="fill-butter"
      />
      <rect
        x="8"
        y="36"
        width="20"
        height="20"
        rx="4"
        className="fill-butter"
      />
      <rect
        x="36"
        y="36"
        width="20"
        height="20"
        rx="4"
        className="fill-[#cfe8fb]"
      />
      <path
        d="M32 46c-4-4-9-4-9 1s9 9 9 9 9-4 9-9-5-5-9-1z"
        className="fill-[#5b9bd5]"
      />
    </svg>
  );
}

export function Onboarding({ open, onDismiss }: OnboardingProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!open) return;
    const startedAt = performance.now();
    let frameId = 0;
    const tick = (now: number) => {
      const nextElapsed = Math.min(now - startedAt, TOTAL_DURATION_MS);
      setElapsed(nextElapsed);
      if (nextElapsed >= TOTAL_DURATION_MS) onDismiss();
      else frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [open, onDismiss]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  const progress = elapsed / TOTAL_DURATION_MS;
  const activeStep = Math.min(
    Math.floor(progress * STEPS.length),
    STEPS.length - 1,
  );
  const step = STEPS[activeStep] ?? STEPS[0];
  if (!step) return null;
  return (
    <div
      className="onboarding-sky fixed inset-0 z-50 flex animate-fade-in flex-col"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="flex justify-end px-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onDismiss}
          className="text-sm font-bold text-muted underline underline-offset-4"
        >
          Skip instructions
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-7 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#3979b7]">
          Quick guide
        </p>
        <h1
          id="onboarding-title"
          className="mt-2 font-display text-4xl leading-[0.98] text-ink sm:text-5xl"
        >
          Share the celebration
        </h1>
        <div
          className="mt-10 flex min-h-56 flex-col items-center justify-center"
          aria-live="polite"
        >
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-[#d8edfc] text-sm font-bold text-[#3979b7] shadow-sm"
            aria-hidden
          >
            {activeStep + 1}
          </span>
          <div className="mt-5">
            <StepIcon step={activeStep} />
          </div>
          <h2 className="mt-5 font-display text-3xl leading-none text-ink">
            {step.title}
          </h2>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted">
            {step.detail}
          </p>
        </div>
      </div>
      <div className="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-line"
          aria-label="Instructions progress"
        >
          <span
            className="block h-full rounded-full bg-[#5b9bd5]"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <p className="mt-3 text-center text-xs text-muted">
          Starting automatically in{" "}
          {Math.max(0, Math.ceil((TOTAL_DURATION_MS - elapsed) / 1000))} seconds
        </p>
      </div>
    </div>
  );
}
