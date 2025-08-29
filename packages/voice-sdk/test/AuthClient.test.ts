import { describe, it, expect } from 'vitest';
import { credentialSchema } from '../src/AuthClient';

describe('credentialSchema', () => {
  it('validates correct data', () => {
    const data = {
      username: 'alice',
      domain: 'example.com',
      password: 'pass',
      wssUrl: 'wss://example.com/ws'
    };
    expect(() => credentialSchema.parse(data)).not.toThrow();
  });

  it('fails on invalid url', () => {
    const data = {
      username: 'alice',
      domain: 'example.com',
      password: 'pass',
      wssUrl: 'not-a-url'
    };
    expect(() => credentialSchema.parse(data)).toThrow();
  });
});
