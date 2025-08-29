export type SDKErrorCode =
  | 'AUTH_FAILED'
  | 'WSS_CONNECT_FAILED'
  | 'REGISTRATION_FAILED'
  | 'MEDIA_PERMISSION_DENIED'
  | 'CALL_FAILED';

export class SDKError extends Error {
  public readonly code: SDKErrorCode;
  public readonly cause?: unknown;

  constructor(code: SDKErrorCode, message: string, cause?: unknown) {
    super(message);
    this.code = code;
    this.cause = cause;
  }
}
