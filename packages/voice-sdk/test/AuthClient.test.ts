import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { credentialSchema, fetchCredentials } from '../src/AuthClient';

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

describe('fetchCredentials', () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('strips trailing slashes from authServer', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        username: 'u', domain: 'd', password: 'p', wssUrl: 'wss://u.d',
        registrar: 'r', outboundProxy: 'o', displayName: 'dn'
      })
    });

    await fetchCredentials('https://api.example.com/', 'token123');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/sip-credentials',
      expect.anything()
    );
  });

  it('parses JSON error body', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Invalid token' })
    });

    await expect(fetchCredentials('https://api.example.com', 'badtoken'))
      .rejects.toThrow('Auth failed with status 403: Invalid token');
  });

  it('handles non-JSON error body gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => { throw new Error('Not JSON'); }
    });

    await expect(fetchCredentials('https://api.example.com', 'badtoken'))
      .rejects.toThrow('Auth failed with status 500');
  });
});
