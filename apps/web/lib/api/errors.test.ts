import { describe, expect, it } from 'vitest';
import { ApiError, errorBody, mapDbError } from './errors';

describe('ApiError', () => {
  it('carries the status from the catalogue', () => {
    expect(new ApiError('phone_blocked').status).toBe(403);
    expect(new ApiError('code_expired').status).toBe(410);
    expect(new ApiError('whatsapp_unavailable').status).toBe(502);
    expect(new ApiError('daily_limit_reached').status).toBe(429);
  });
  it('builds the standard body and leaves out empty details', () => {
    expect(errorBody(new ApiError('invalid_phone'), 'req_1')).toEqual({
      error: { code: 'invalid_phone', message: 'Enter a Nigerian phone number, for example 0803 123 4567.' },
      request_id: 'req_1',
    });
    expect(errorBody(new ApiError('invalid_code', 'x', { tries_left: 4 }), 'req_2').error.details).toEqual({ tries_left: 4 });
  });
});

describe('mapDbError (doc 07 section 1.3)', () => {
  it.each([
    ['42501', '', 'not_authorized'],
    ['P0002', '', 'listing_not_found'],
    ['55000', '', 'invalid_state'],
    ['55006', '', 'listing_locked'],
    ['54000', '', 'daily_limit_reached'],
    ['23514', 'reason_required', 'reason_required'],
    ['23514', 'invalid_media_path', 'invalid_media_path'],
    ['23514', 'seller_name_required', 'name_required'],
    ['23514', 'something else', 'validation_failed'],
    ['OB001', '', 'token_invalid'],
    ['OB002', '', 'token_used'],
    ['OB003', '', 'token_expired'],
    ['OB004', '', 'token_revoked'],
    ['OB005', '', 'already_claimed'],
    ['OB006', '', 'already_admin'],
  ])('%s %s -> %s', (code, message, expected) => {
    expect(mapDbError({ code, message })?.code).toBe(expected);
  });
  it('returns null for unknown codes so the route can decide', () => {
    expect(mapDbError({ code: '23505' })).toBeNull();
    expect(mapDbError(null)).toBeNull();
  });
});
