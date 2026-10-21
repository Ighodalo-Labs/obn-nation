import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

/** Supabase bucket "videos" refuses anything above 10 MiB. We aim for 9 MiB. */
export const VIDEO_BUCKET_LIMIT_BYTES = 10 * 1024 * 1024;
export const VIDEO_TARGET_BYTES = 9 * 1024 * 1024;
export const VIDEO_MAX_SECONDS = 60;
export const VIDEO_MAX_INPUT_BYTES = 150 * 1024 * 1024;

const AUDIO_BITRATE = 64_000;
/** Self-hosted single-thread core in /public/ffmpeg. Single thread needs no special browser headers. */
const CORE_BASE_URL = '/ffmpeg';
const ACCEPTED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp'] as const;

export type VideoErrorCode =
  | 'unsupported_type'
  | 'input_too_large'
  | 'too_long'
  | 'unreadable'
  | 'cannot_fit_under_limit'
  | 'engine_failed'
  | 'cancelled';

export class VideoCompressionError extends Error {
  constructor(public readonly code: VideoErrorCode, message: string) {
    super(message);
    this.name = 'VideoCompressionError';
  }
}

export interface CompressVideoOptions {
  signal?: AbortSignal;
  /** 0-100 while encoding. */
  onProgress?: (percent: number) => void;
}

let enginePromise: Promise<FFmpeg> | null = null;

/** Download the encoder once per page visit (about 30 MB). Only called when a seller adds a video. */
function loadEngine(): Promise<FFmpeg> {
  if (!enginePromise) {
    enginePromise = (async () => {
      const ffmpeg = new FFmpeg();
      await ffmpeg.load({
        coreURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      return ffmpeg;
    })().catch(() => {
      enginePromise = null; // allow a retry on the next attempt
      throw new VideoCompressionError(
        'engine_failed',
        'The video tool could not load. Check your network and try again.',
      );
    });
  }
  return enginePromise;
}

/** Start downloading the encoder in the background, so it is ready by the time a seller picks a video. */
export function preloadVideoEngine(): void {
  void loadEngine().catch(() => undefined);
}

/** Read the length of a video in seconds without decoding it. */
export function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
      video.load();
    };
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const seconds = video.duration;
      cleanup();
      if (Number.isFinite(seconds) && seconds > 0) resolve(seconds);
      else reject(new VideoCompressionError('unreadable', 'We could not read this video.'));
    };
    video.onerror = () => {
      cleanup();
      reject(new VideoCompressionError('unreadable', 'We could not read this video.'));
    };
    video.src = url;
  });
}

/** Check type, size and length before spending time on encoding. Returns the duration in seconds. */
export async function validateVideo(file: File): Promise<number> {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
    throw new VideoCompressionError('unsupported_type', 'Please choose an MP4 or phone video.');
  }
  if (file.size > VIDEO_MAX_INPUT_BYTES) {
    throw new VideoCompressionError(
      'input_too_large',
      'This video is too big to process on your phone. Record a shorter one or lower the quality.',
    );
  }
  const seconds = await readVideoDuration(file);
  if (seconds > VIDEO_MAX_SECONDS + 0.5) {
    throw new VideoCompressionError('too_long', `Videos can be at most ${VIDEO_MAX_SECONDS} seconds.`);
  }
  return seconds;
}

interface Pass {
  height: number;
  videoBitrate: number;
}

function planPasses(seconds: number): Pass[] {
  const totalBits = VIDEO_TARGET_BYTES * 8;
  const first = Math.max(150_000, Math.floor(totalBits / seconds) - AUDIO_BITRATE);
  // 480p is plenty for a listing video on a phone, and it encodes about twice as fast as 720p.
  const fast = Math.min(first, 1_000_000);
  return [
    { height: 480, videoBitrate: fast },
    { height: 360, videoBitrate: Math.max(120_000, Math.floor(fast * 0.7)) },
  ];
}

/**
 * Turn any phone video of up to 60 seconds into an MP4 (H.264 + AAC) under 10 MB.
 * Returns a File named "video.mp4". Throws VideoCompressionError with a message fit to show the seller.
 */
export async function compressVideo(file: File, options: CompressVideoOptions = {}): Promise<File> {
  const seconds = await validateVideo(file);
  // A small MP4 is uploaded as it is. No waiting.
  if (file.type === 'video/mp4' && file.size <= VIDEO_TARGET_BYTES) {
    options.onProgress?.(100);
    return new File([file], 'video.mp4', { type: 'video/mp4', lastModified: Date.now() });
  }
  const ffmpeg = await loadEngine();

  const onProgress = ({ progress }: { progress: number }) => {
    options.onProgress?.(Math.min(99, Math.max(0, Math.round(progress * 100))));
  };
  const onAbort = () => ffmpeg.terminate();
  ffmpeg.on('progress', onProgress);
  options.signal?.addEventListener('abort', onAbort, { once: true });

  const inputName = 'input';
  const outputName = 'output.mp4';

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    for (const pass of planPasses(seconds)) {
      const code = await ffmpeg.exec([
        '-i', inputName,
        '-vf', `scale=-2:'min(${pass.height},ih)'`,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-b:v', String(pass.videoBitrate),
        '-maxrate', String(Math.floor(pass.videoBitrate * 1.2)),
        '-bufsize', String(pass.videoBitrate * 2),
        '-c:a', 'aac',
        '-b:a', String(AUDIO_BITRATE),
        '-ac', '1',
        '-movflags', '+faststart',
        '-y', outputName,
      ]);
      if (code !== 0) {
        throw new VideoCompressionError('unreadable', 'We could not process this video. Try another one.');
      }
      const data = await ffmpeg.readFile(outputName);
      if (typeof data === 'string') {
        throw new VideoCompressionError('engine_failed', 'The video tool returned an unexpected result.');
      }
      if (data.byteLength < VIDEO_BUCKET_LIMIT_BYTES) {
        options.onProgress?.(100);
        return new File([new Uint8Array(data)], 'video.mp4', { type: 'video/mp4', lastModified: Date.now() });
      }
      await ffmpeg.deleteFile(outputName);
    }

    throw new VideoCompressionError(
      'cannot_fit_under_limit',
      'This video is still too big after shrinking. Please use a shorter one.',
    );
  } catch (err) {
    if (options.signal?.aborted) {
      enginePromise = null; // terminate() kills the worker, so load a fresh engine next time
      throw new VideoCompressionError('cancelled', 'Video upload cancelled.');
    }
    if (err instanceof VideoCompressionError) throw err;
    throw new VideoCompressionError('engine_failed', 'Something went wrong while shrinking the video. Try again.');
  } finally {
    ffmpeg.off('progress', onProgress);
    options.signal?.removeEventListener('abort', onAbort);
    try { await ffmpeg.deleteFile(inputName); } catch { /* engine may already be terminated */ }
    try { await ffmpeg.deleteFile(outputName); } catch { /* nothing to delete */ }
  }
}
