import { describe, it, expect } from 'vitest';
import { validateVoiceSDKOptions, validateAuthResponse } from '../src/validation';
import { SDKError } from '../src/errors';

describe('validateVoiceSDKOptions', () => {
  it('returns sanitized options', () => {
    const opts = validateVoiceSDKOptions({
      authHost: 'https://auth.example.com',
      getToken: async () => 'token',
      fetch: async () => new Response(),
    });
    expect(opts.authHost).toBe('https://auth.example.com');
  });

  it('throws on invalid options', () => {
    expect(() => validateVoiceSDKOptions({})).toThrow(SDKError);
  });

  it('throws when options is not an object', () => {
    expect(() => validateVoiceSDKOptions(null)).toThrow(SDKError);
  });

  it('rejects non-function getToken', () => {
    expect(() =>
      validateVoiceSDKOptions({ authHost: 'a', getToken: 'bad' as any })
    ).toThrow(SDKError);
  });

  it('rejects non-function fetch', () => {
    expect(() =>
      validateVoiceSDKOptions({
        authHost: 'a',
        getToken: async () => 't',
        fetch: 123 as any,
      })
    ).toThrow(SDKError);
  });
});

describe('validateAuthResponse', () => {
  it('returns sanitized response', () => {
    const resp = validateAuthResponse({
      username: 'u',
      domain: 'd',
      password: 'p',
      wssUrl: 'wss://example',
      registrar: 'r',
      outboundProxy: 'o',
      displayName: 'n',
      stunServers: ['stun:1'],
      turnServers: ['turn:1'],
    });
    expect(resp.username).toBe('u');
    expect(resp.stunServers?.[0]).toBe('stun:1');
  });

  it('throws on invalid response', () => {
    expect(() => validateAuthResponse({})).toThrow(SDKError);
  });

  it('throws when response is not an object', () => {
    expect(() => validateAuthResponse(null)).toThrow(SDKError);
  });

  it('throws on invalid array fields', () => {
    expect(() =>
      validateAuthResponse({
        username: 'u',
        domain: 'd',
        password: 'p',
        wssUrl: 'wss://example',
        stunServers: [1] as any,
      })
    ).toThrow(SDKError);
  });
});
