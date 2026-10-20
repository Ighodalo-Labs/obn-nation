import { describe, expect, it } from 'vitest';
import { maskPhone, normalizeNgPhone } from './phone';

describe('normalizeNgPhone (PRD SI-1)', () => {
  it.each([
    ['08031234567', '+2348031234567'],
    ['8031234567', '+2348031234567'],
    ['+2348031234567', '+2348031234567'],
    ['2348031234567', '+2348031234567'],
    ['+234 803 123 4567', '+2348031234567'],
    ['0803-123-4567', '+2348031234567'],
    ['(0803) 123 4567', '+2348031234567'],
    ['+23408031234567', '+2348031234567'],
    ['07072767227', '+2347072767227'],
    ['09162388282', '+2349162388282'],
  ])('%s -> %s', (input, expected) => expect(normalizeNgPhone(input)).toBe(expected));

  it.each(['', 'abc', '0603123456', '06031234567', '0803123456', '080312345678', '+14155550123', '+2336031234567', '803123456', '0803 123 45 6x'])(
    'rejects %j',
    (input) => expect(normalizeNgPhone(input)).toBeNull(),
  );
});

describe('maskPhone', () => {
  it('keeps the country code and the last two digits', () => {
    expect(maskPhone('+2348031234567')).toBe('+234 ••• ••• ••67');
  });
});
