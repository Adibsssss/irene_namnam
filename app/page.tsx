"use client";

import { useEffect, useRef, useState } from "react";
import { Gallery } from "@/components/Gallery";
import { Onboarding } from "@/components/Onboarding";
import { UploadButton } from "@/components/UploadButton";
import { UploadProgress } from "@/components/UploadProgress";
import { WeddingHero } from "@/components/WeddingHero";
import { useGalleryPolling } from "@/hooks/useGalleryPolling";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useUpload } from "@/hooks/useUpload";

export default function Page() {
  const { showOnboarding, dismiss } = useOnboarding();

  const { photos, status, hasMore, loadingMore, loadMore, addOptimisticPhoto } =
    useGalleryPolling();

  const { tasks, enqueueFiles, retryTask, removeTask } = useUpload({
    onPhotoUploaded: addOptimisticPhoto,
  });

  const previousCount = useRef(photos.length);
  const [tickKey, setTickKey] = useState(0);

  useEffect(() => {
    if (photos.length > previousCount.current) {
      setTickKey((k) => k + 1);
    }

    previousCount.current = photos.length;
  }, [photos.length]);

  return (
    <main className="min-h-screen bg-paper pb-32">
      <header className="glass-surface sticky top-0 z-20 px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl items-center gap-2.5">
          <span className="hidden" aria-hidden>
            ✦
          </span>

          <p className="font-display text-lg leading-none text-ink">
            Nam-Nam &amp; Irish
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10 lg:px-8 lg:pt-12">
        <WeddingHero />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-4 pt-10 sm:px-6 sm:pt-14 lg:px-8 lg:pt-16">
        <h2 className="font-display text-3xl text-ink sm:text-4xl lg:text-5xl">
          Our day, through your eyes
        </h2>

        <Gallery
          photos={photos}
          status={status}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
        />
      </section>

      <UploadProgress
        tasks={tasks}
        onRetry={retryTask}
        onDismiss={removeTask}
      />

      <UploadButton onFilesSelected={enqueueFiles} />

      <Onboarding open={showOnboarding} onDismiss={dismiss} />
    </main>
  );
}
