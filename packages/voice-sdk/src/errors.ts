export type ErrorCode =
  | 'AUTH_FAILED'
  | 'WSS_CONNECT_FAILED'
  | 'REGISTRATION_FAILED'
  | 'MEDIA_PERMISSION_DENIED'
  | 'CALL_FAILED';

export class SDKError extends Error {
  constructor(public readonly code: ErrorCode, message: string) {
    super(message);
    this.name = 'SDKError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
