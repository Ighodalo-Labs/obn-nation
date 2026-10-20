'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { friendlyMediaError, planPhotoBatch, TOO_MANY_PHOTOS } from '@/lib/media/plan';

export interface PhotoItem {
  id: string;
  name: string;
  status: 'working' | 'done' | 'error';
  file?: File;
  url?: string;
  bytes?: number;
  error?: string;
}

export interface VideoState {
  status: 'idle' | 'checking' | 'compressing' | 'done' | 'error';
  percent: number;
  name?: string;
  file?: File;
  url?: string;
  bytes?: number;
  error?: string;
}

const IDLE_VIDEO: VideoState = { status: 'idle', percent: 0 };

/**
 * Holds the photos and the video while the seller fills step 3.
 * Compression runs on the phone, one photo at a time. The video encoder is loaded only when a video is added (FM-6).
 * Nothing here is saved between page loads (FM-2).
 */
export function useMedia() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [video, setVideo] = useState<VideoState>(IDLE_VIDEO);
  const [notice, setNotice] = useState<string | null>(null);
  const photosRef = useRef<PhotoItem[]>([]);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const videoAbort = useRef<AbortController | null>(null);
  const urls = useRef<Set<string>>(new Set());

  photosRef.current = photos;

  const track = (file: Blob) => {
    const url = URL.createObjectURL(file);
    urls.current.add(url);
    return url;
  };
  const release = (url?: string) => {
    if (url && urls.current.delete(url)) URL.revokeObjectURL(url);
  };

  useEffect(
    () => () => {
      videoAbort.current?.abort();
      urls.current.forEach((u) => URL.revokeObjectURL(u));
      urls.current.clear();
    },
    [],
  );

  const addPhotos = useCallback((files: File[]) => {
    setNotice(null);
    const { accepted, overflow } = planPhotoBatch(photosRef.current.filter((p) => p.status !== 'error').length, files);
    if (overflow > 0) setNotice(TOO_MANY_PHOTOS);
    if (accepted.length === 0) return;

    const items: PhotoItem[] = accepted.map((f) => ({ id: crypto.randomUUID(), name: f.name, status: 'working' }));
    photosRef.current = [...photosRef.current, ...items];
    setPhotos(photosRef.current);

    accepted.forEach((file, i) => {
      const id = items[i].id;
      // One at a time: parallel work crashes cheap phones.
      queue.current = queue.current.then(async () => {
        if (!photosRef.current.some((p) => p.id === id)) return; // removed while waiting
        try {
          const { compressImage } = await import('@/lib/compression/images');
          const slot = photosRef.current.findIndex((p) => p.id === id) + 1;
          const out = await compressImage(file, { index: slot });
          const url = track(out);
          setPhotos((list) => list.map((p) => (p.id === id ? { ...p, status: 'done', file: out, url, bytes: out.size } : p)));
        } catch (e) {
          const error = friendlyMediaError(e, 'This photo could not be prepared. Please try another one.');
          setPhotos((list) => list.map((p) => (p.id === id ? { ...p, status: 'error', error } : p)));
        }
      });
    });
  }, []);

  const removePhoto = useCallback((id: string) => {
    setNotice(null);
    setPhotos((list) => {
      release(list.find((p) => p.id === id)?.url);
      return list.filter((p) => p.id !== id);
    });
  }, []);

  const addVideo = useCallback(async (file: File) => {
    release(video.url);
    setNotice(null);
    setVideo({ status: 'checking', percent: 0, name: file.name });
    const abort = new AbortController();
    videoAbort.current = abort;
    try {
      const { validateVideo, compressVideo } = await import('@/lib/compression/video');
      await validateVideo(file); // refuses over 60 seconds before any encoding starts (FM-5)
      setVideo({ status: 'compressing', percent: 0, name: file.name });
      const out = await compressVideo(file, {
        signal: abort.signal,
        onProgress: (percent) => setVideo((v) => (v.status === 'compressing' ? { ...v, percent } : v)),
      });
      setVideo({ status: 'done', percent: 100, name: file.name, file: out, url: track(out), bytes: out.size });
    } catch (e) {
      if (abort.signal.aborted) return setVideo(IDLE_VIDEO);
      setVideo({ status: 'error', percent: 0, name: file.name, error: friendlyMediaError(e, 'This video could not be prepared. Please try another video.') });
    } finally {
      videoAbort.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.url]);

  const cancelVideo = useCallback(() => {
    videoAbort.current?.abort();
    setVideo(IDLE_VIDEO);
  }, []);

  const removeVideo = useCallback(() => {
    release(video.url);
    setVideo(IDLE_VIDEO);
  }, [video.url]);

  const ready = photos.filter((p) => p.status === 'done').length;
  const busy = photos.some((p) => p.status === 'working') || video.status === 'checking' || video.status === 'compressing';
  return { photos, video, notice, ready, busy, addPhotos, removePhoto, addVideo, cancelVideo, removeVideo };
}

export type MediaApi = ReturnType<typeof useMedia>;
