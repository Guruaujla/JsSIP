
export interface VoiceSDKOptions {
  token: string;
  authServer: string;
  ice?: {
    stun?: string[];
    turn?: { urls: string[]; username: string; credential: string }[];
    trickle?: boolean;
  };
  media?: {
    audioInputId?: string;
    outputDeviceId?: string;
    constraints?: MediaTrackConstraints;
  };
  sounds?: {
    ringtoneUrl?: string;
  };
  sip?: {
    displayName?: string;
    userAgentString?: string;
    registerExpiresSec?: number;
    keepAliveIntervalSec?: number;
    outboundProxy?: string;
    registrar?: string;
  };
  logging?: 'none' | 'error' | 'info' | 'debug';
}

export interface CallOptions {
  target: string;
  withEarlyMedia?: boolean;
  dtmfMode?: 'RFC2833' | 'SIP_INFO';
  extraHeaders?: string[];
}

export type CallState =
  | 'new'
  | 'ringing'
  | 'established'
  | 'held'
  | 'muted'
  | 'ended'
  | 'failed';

export interface CallSummary {
  id: string;
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  startTime: number;
  answerTime?: number;
  endTime?: number;
  duration: number; // in seconds
  result: 'Answered' | 'Missed' | 'Rejected' | 'Failed' | 'Busy';
}

export interface VoiceSDKEvents {
  ready: void;
  connectionChanged: {
    state: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  };
  registrationChanged: {
    state: 'registered' | 'unregistered' | 'failed';
    reason?: string;
  };
  incomingCall: { session: CallSession; from: string; displayName?: string };
  callUpdated: { session: CallSession; state: CallState; reason?: string };
  callSummary: CallSummary;
  deviceChanged: {
    microphones: MediaDeviceInfo[];
    speakers: MediaDeviceInfo[];
  };
  error: { code: string; message: string; cause?: unknown };
}

export interface CallSession {
  id: string;
  direction: 'inbound' | 'outbound';
  state: CallState;
  startTime: number;
  answerTime?: number;
  endTime?: number;
  localStream?: MediaStream;
  remoteStream?: MediaStream;
  answer(options?: { audio?: boolean }): Promise<void>;
  hangup(): Promise<void>;
  hold(): Promise<void>;
  resume(): Promise<void>;
  mute(): Promise<void>;
  unmute(): Promise<void>;
  sendDTMF(tone: string): Promise<void>;
  transfer(target: string): Promise<void>;
  getSummary(): CallSummary;
}
