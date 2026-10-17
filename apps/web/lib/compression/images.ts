import imageCompression from 'browser-image-compression';

/** Supabase bucket "photos" refuses anything above 1 MiB. We aim lower so we never sit on the edge. */
export const IMAGE_BUCKET_LIMIT_BYTES = 1_048_576;
export const IMAGE_TARGET_MB = 0.9; // browser-image-compression counts MB as 1024 * 1024 bytes
export const IMAGE_MAX_INPUT_BYTES = 30 * 1024 * 1024;
export const IMAGE_MAX_COUNT = 6;

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
/** Longest edge in pixels. We try each size in turn until the file fits under the limit. */
const EDGE_STEPS = [1600, 1280, 1024, 800] as const;

export type ImageErrorCode =
  | 'unsupported_type'
  | 'input_too_large'
  | 'too_many_files'
  | 'cannot_fit_under_limit'
  | 'decode_failed';

export class ImageCompressionError extends Error {
  constructor(
    public readonly code: ImageErrorCode,
    /** Plain message that is safe to show to the seller. */
    message: string,
    public readonly fileName?: string,
  ) {
    super(message);
    this.name = 'ImageCompressionError';
  }
}

export interface CompressImageOptions {
  /** Used to name the output file: "<index>.webp". */
  index: number;
  signal?: AbortSignal;
  /** Called with 0-100 for this one file. */
  onProgress?: (percent: number) => void;
}

function assertAcceptable(file: File): void {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
    throw new ImageCompressionError(
      'unsupported_type',
      'Please choose a JPG, PNG or WebP photo.',
      file.name,
    );
  }
  if (file.size > IMAGE_MAX_INPUT_BYTES) {
    throw new ImageCompressionError(
      'input_too_large',
      'This photo is too big to process. Please pick a smaller one.',
      file.name,
    );
  }
}

/** Compress one photo to WebP under 1 MB. Returns a new File named "<index>.webp". */
export async function compressImage(file: File, options: CompressImageOptions): Promise<File> {
  assertAcceptable(file);

  for (const edge of EDGE_STEPS) {
    let output: File;
    try {
      output = await imageCompression(file, {
        maxSizeMB: IMAGE_TARGET_MB,
        maxWidthOrHeight: edge,
        fileType: 'image/webp',
        initialQuality: 0.8,
        useWebWorker: true,
        alwaysKeepResolution: false,
        signal: options.signal,
        onProgress: options.onProgress,
      });
    } catch (err) {
      if (options.signal?.aborted) throw err;
      throw new ImageCompressionError(
        'decode_failed',
        'We could not read this photo. Try another one.',
        file.name,
      );
    }
    if (output.size < IMAGE_BUCKET_LIMIT_BYTES) {
      return new File([output], `${options.index}.webp`, {
        type: 'image/webp',
        lastModified: Date.now(),
      });
    }
  }

  throw new ImageCompressionError(
    'cannot_fit_under_limit',
    'This photo is still too big after shrinking. Please pick another one.',
    file.name,
  );
}

export interface CompressImagesOptions {
  signal?: AbortSignal;
  /** Overall progress, 0-100, across all files. */
  onProgress?: (percent: number) => void;
  /** Called after each file finishes. */
  onFileDone?: (index: number, result: File) => void;
}

/**
 * Compress up to six photos, one at a time (parallel work crashes cheap phones).
 * Stops at the first failure and throws an ImageCompressionError that names the file.
 */
export async function compressImages(files: File[], options: CompressImagesOptions = {}): Promise<File[]> {
  if (files.length > IMAGE_MAX_COUNT) {
    throw new ImageCompressionError('too_many_files', `You can add up to ${IMAGE_MAX_COUNT} photos.`);
  }
  const results: File[] = [];
  for (let i = 0; i < files.length; i += 1) {
    const done = await compressImage(files[i], {
      index: i + 1,
      signal: options.signal,
      onProgress: (p) => options.onProgress?.(Math.round(((i + p / 100) / files.length) * 100)),
    });
    results.push(done);
    options.onFileDone?.(i, done);
  }
  options.onProgress?.(100);
  return results;
}
