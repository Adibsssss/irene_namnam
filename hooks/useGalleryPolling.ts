'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GalleryResponse, Photo } from '@/types';

const POLL_INTERVAL_MS = 7000;

async function fetchGallery(pageToken?: string): Promise<GalleryResponse> {
  const url = new URL('/api/gallery', window.location.origin);
  if (pageToken) url.searchParams.set('pageToken', pageToken);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to load gallery');
  return (await res.json()) as GalleryResponse;
}

export function useGalleryPolling() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadingMore, setLoadingMore] = useState(false);

  // Mutable, doesn't need to trigger re-renders on its own.
  const knownIds = useRef<Set<string>>(new Set());
  const pollInFlight = useRef(false);

  const loadInitial = useCallback(async () => {
    setStatus('loading');
    try {
      const data = await fetchGallery();
      knownIds.current = new Set(data.photos.map((p) => p.id));
      setPhotos(data.photos);
      setNextPageToken(data.nextPageToken);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextPageToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchGallery(nextPageToken);
      const freshOnes = data.photos.filter((p) => !knownIds.current.has(p.id));
      freshOnes.forEach((p) => knownIds.current.add(p.id));
      setPhotos((prev) => [...prev, ...freshOnes]);
      setNextPageToken(data.nextPageToken);
    } catch {
      // Leave nextPageToken in place so the button can simply be tapped again.
    } finally {
      setLoadingMore(false);
    }
  }, [nextPageToken, loadingMore]);

  // Merges the newest page into state: brand-new photos are prepended, and
  // any placeholder entry that's still missing its dimensions (see
  // addOptimisticPhoto) gets backfilled once Drive has processed it.
  const mergeLatestPage = useCallback((data: GalleryResponse) => {
    setPhotos((prev) => {
      const byId = new Map(prev.map((p) => [p.id, p] as const));
      const incomingNew: Photo[] = [];
      let patched = false;

      for (const photo of data.photos) {
        if (!knownIds.current.has(photo.id)) {
          knownIds.current.add(photo.id);
          incomingNew.push(photo);
          continue;
        }
        const existing = byId.get(photo.id);
        if (existing && existing.width == null && photo.width != null) {
          byId.set(photo.id, { ...existing, width: photo.width, height: photo.height });
          patched = true;
        }
      }

      if (incomingNew.length === 0 && !patched) return prev;
      const merged = prev.map((p) => byId.get(p.id) ?? p);
      return [...incomingNew, ...merged];
    });
  }, []);

  const poll = useCallback(async () => {
    if (pollInFlight.current || document.visibilityState !== 'visible') return;
    pollInFlight.current = true;
    try {
      const data = await fetchGallery();
      mergeLatestPage(data);
    } catch {
      // A single missed poll isn't worth surfacing to the user.
    } finally {
      pollInFlight.current = false;
    }
  }, [mergeLatestPage]);

  useEffect(() => {
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') poll();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [poll]);

  /** Called the moment a client-side upload finishes, so it appears instantly rather than waiting for the next poll. */
  const addOptimisticPhoto = useCallback((photo: Photo) => {
    if (knownIds.current.has(photo.id)) return;
    knownIds.current.add(photo.id);
    setPhotos((prev) => [photo, ...prev]);
  }, []);

  return {
    photos,
    status,
    hasMore: nextPageToken !== null,
    loadingMore,
    loadMore,
    addOptimisticPhoto,
  };
}
