import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchCredentials } from '../src/AuthClient';

// Mock global fetch
const originalFetch = global.fetch;

describe('AuthClient', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should construct URL correctly by removing trailing slashes', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        username: 'u', domain: 'd', password: 'p', wssUrl: 'wss://u',
      })
    });

    await fetchCredentials('http://api.com/', 'token');
    expect(global.fetch).toHaveBeenCalledWith('http://api.com/sip-credentials', expect.anything());

    await fetchCredentials('http://api.com', 'token');
    expect(global.fetch).toHaveBeenCalledWith('http://api.com/sip-credentials', expect.anything());
  });

  it('should parse JSON error messages from server', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Token expired' })
    });

    await expect(fetchCredentials('http://api.com', 'token'))
      .rejects.toThrow('Auth failed: Token expired');
  });

  it('should fallback to status code if JSON parsing fails', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => { throw new Error('Invalid JSON'); }
    });

    await expect(fetchCredentials('http://api.com', 'token'))
      .rejects.toThrow('Auth failed with status 500');
  });

  it('should parse "error" field in JSON error response', async () => {
     (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Bad Request' })
    });

    await expect(fetchCredentials('http://api.com', 'token'))
      .rejects.toThrow('Auth failed: Bad Request');
  });
});
