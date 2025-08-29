import { describe, it, expect } from 'vitest';
import { SDKError } from '../src/errors';

describe('SDKError', () => {
  it('exposes code and message', () => {
    const err = new SDKError('AUTH_FAILED', 'bad');
    expect(err.code).toBe('AUTH_FAILED');
    expect(err.message).toBe('bad');
    expect(err.name).toBe('SDKError');
    expect(err instanceof Error).toBe(true);
  });
});
