import { SDKError } from './errors';
import type { VoiceSDKOptions } from './types';

export interface AuthResponse {
  readonly username: string;
  readonly domain: string;
  readonly password: string;
  readonly wssUrl: string;
  readonly registrar?: string;
  readonly outboundProxy?: string;
  readonly displayName?: string;
  readonly stunServers?: readonly string[];
  readonly turnServers?: readonly string[];
}

export function validateVoiceSDKOptions(opts: unknown): VoiceSDKOptions {
  if (!opts || typeof opts !== 'object') {
    throw new SDKError('AUTH_FAILED', 'options must be an object');
  }
  const { authHost, getToken, fetch: fetchImpl } = opts as Record<string, unknown>;
  if (typeof authHost !== 'string' || authHost.length === 0) {
    throw new SDKError('AUTH_FAILED', 'authHost must be a non-empty string');
  }
  if (typeof getToken !== 'function') {
    throw new SDKError('AUTH_FAILED', 'getToken must be a function');
  }
  if (fetchImpl !== undefined && typeof fetchImpl !== 'function') {
    throw new SDKError('AUTH_FAILED', 'fetch must be a function');
  }
  return {
    authHost,
    getToken: getToken as () => Promise<string>,
    fetch: fetchImpl as typeof fetch | undefined,
  };
}

export function validateAuthResponse(data: unknown): AuthResponse {
  if (!data || typeof data !== 'object') {
    throw new SDKError('AUTH_FAILED', 'auth response must be an object');
  }
  const {
    username,
    domain,
    password,
    wssUrl,
    registrar,
    outboundProxy,
    displayName,
    stunServers,
    turnServers,
  } = data as Record<string, unknown>;

  const required = { username, domain, password, wssUrl };
  for (const [key, value] of Object.entries(required)) {
    if (typeof value !== 'string' || value.length === 0) {
      throw new SDKError('AUTH_FAILED', `${key} must be a non-empty string`);
    }
  }

  const checkArray = (arr: unknown, field: string): readonly string[] | undefined => {
    if (arr === undefined) return undefined;
    if (!Array.isArray(arr) || arr.some((v) => typeof v !== 'string')) {
      throw new SDKError('AUTH_FAILED', `${field} must be an array of strings`);
    }
    return arr as string[];
  };

  return {
    username: username as string,
    domain: domain as string,
    password: password as string,
    wssUrl: wssUrl as string,
    registrar: registrar as string | undefined,
    outboundProxy: outboundProxy as string | undefined,
    displayName: displayName as string | undefined,
    stunServers: checkArray(stunServers, 'stunServers'),
    turnServers: checkArray(turnServers, 'turnServers'),
  };
}
