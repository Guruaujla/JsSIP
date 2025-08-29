export type ConnectionState = 'disconnected' | 'connecting' | 'connected';
export type RegistrationState = 'unregistered' | 'registering' | 'registered';
export type CallState = 'idle' | 'ringing' | 'active' | 'held' | 'ended';

export interface VoiceSDKOptions {
  readonly authHost: string;
  readonly getToken: () => Promise<string>;
  readonly fetch?: typeof fetch;
}

export interface CallOptions {
  readonly media?: MediaStreamConstraints;
}

export interface CallSession {
  readonly id: string;
  readonly state: CallState;
  mute(): void;
  unmute(): void;
  hold(): void;
  unhold(): void;
  dtmf(tone: string): void;
  transfer(target: string): void;
  hangup(): void;
  on(event: 'ended' | 'updated', handler: () => void): void;
}

export interface VoiceSDKEvents {
  connectionChanged: (state: ConnectionState) => void;
  registrationChanged: (state: RegistrationState) => void;
  incomingCall: (session: CallSession) => void;
  callUpdated: (session: CallSession) => void;
}
