import { describe, expect, it } from 'vitest';
import { friendlyMediaError, humanSize, planPhotoBatch } from './plan';

describe('planPhotoBatch', () => {
  it('accepts everything when there is room', () => {
    expect(planPhotoBatch(0, ['a', 'b'])).toEqual({ accepted: ['a', 'b'], overflow: 0 });
  });
  it('fills the six slots and reports the overflow', () => {
    expect(planPhotoBatch(4, ['a', 'b', 'c', 'd'])).toEqual({ accepted: ['a', 'b'], overflow: 2 });
  });
  it('accepts nothing when full', () => {
    expect(planPhotoBatch(6, ['a'])).toEqual({ accepted: [], overflow: 1 });
  });
  it('handles an empty choice', () => {
    expect(planPhotoBatch(2, [])).toEqual({ accepted: [], overflow: 0 });
  });
});

describe('humanSize', () => {
  it.each([[100, '1 KB'], [412 * 1024, '412 KB'], [1024 * 1024, '1.0 MB'], [2.4 * 1024 * 1024, '2.4 MB']])('%d -> %s', (n, s) => {
    expect(humanSize(n)).toBe(s);
  });
});

describe('friendlyMediaError', () => {
  it('passes through our own coded messages', () => {
    const e = Object.assign(new Error('Please choose a JPG, PNG or WebP photo.'), { code: 'unsupported_type' });
    expect(friendlyMediaError(e, 'x')).toBe('Please choose a JPG, PNG or WebP photo.');
  });
  it('explains a full phone', () => {
    expect(friendlyMediaError(new DOMException('full', 'QuotaExceededError'), 'x')).toBe('Your phone has no space left.');
  });
  it('uses the fallback for anything else', () => {
    expect(friendlyMediaError(new Error('boom'), 'Try another photo.')).toBe('Try another photo.');
    expect(friendlyMediaError('str', 'Try another photo.')).toBe('Try another photo.');
  });
});
