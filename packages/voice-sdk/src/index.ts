import JsSIP from 'jssip';
import EventEmitter from 'eventemitter3';
import { fetchCredentials } from './AuthClient';
import { SDKError } from './errors';
import type {
  VoiceSDKOptions,
  CallOptions,
  VoiceSDKEvents,
  CallSession,
  CallState
} from './types';
import type { UAConfiguration } from 'jssip/lib/UA';
import type { RTCSession } from 'jssip/lib/RTCSession';

class SimpleCallSession implements CallSession {
  public id: string;
  public direction: 'inbound' | 'outbound';
  public state: CallState = 'new';
  constructor(private session: RTCSession, direction: 'inbound' | 'outbound') {
    this.id = session.id;
    this.direction = direction;
  }
  async answer(): Promise<void> {
    this.session.answer();
    this.state = 'established';
  }
  async hangup(): Promise<void> {
    this.session.terminate();
    this.state = 'ended';
  }
  async hold(): Promise<void> {
    this.session.hold();
    this.state = 'held';
  }
  async resume(): Promise<void> {
    this.session.unhold();
    this.state = 'established';
  }
  async mute(): Promise<void> {
    this.session.mute();
    this.state = 'muted';
  }
  async unmute(): Promise<void> {
    this.session.unmute();
    this.state = 'established';
  }
  async sendDTMF(tone: string): Promise<void> {
    this.session.sendDTMF(tone);
  }
  async transfer(target: string): Promise<void> {
    this.session.refer(target);
  }
}

type EventMap = { [K in keyof VoiceSDKEvents]: [VoiceSDKEvents[K]] };

export class VoiceSDK {
  private opts: VoiceSDKOptions;
  private ua?: JsSIP.UA;
  private emitter = new EventEmitter<EventMap>();
  private sessions = new Map<string, SimpleCallSession>();
  private domain?: string;

  constructor(opts: VoiceSDKOptions) {
    this.opts = opts;
  }

  async init(): Promise<void> {
    try {
      const creds = await fetchCredentials(this.opts.authServer, this.opts.token);
      this.domain = creds.domain;
      const socket = new JsSIP.WebSocketInterface(creds.wssUrl);
      const configuration: UAConfiguration = {
        sockets: [socket],
        uri: `sip:${creds.username}@${creds.domain}`,
        password: creds.password,
        session_timers: false,
        registrar_server: creds.registrar,
        display_name: creds.displayName ?? this.opts.sip?.displayName,
        user_agent: this.opts.sip?.userAgentString
      };
      this.ua = new JsSIP.UA(configuration);
      this.attachUaHandlers();
      this.ua.start();
      this.emitter.emit('connectionChanged', { state: 'connecting' });
    } catch (err) {
      throw new SDKError('AUTH_FAILED', 'Failed to initialize', err);
    }
  }

  private attachUaHandlers(): void {
    if (!this.ua) return;
    this.ua.on('connected', () =>
      this.emitter.emit('connectionChanged', { state: 'connected' })
    );
    this.ua.on('disconnected', () =>
      this.emitter.emit('connectionChanged', { state: 'disconnected' })
    );
    this.ua.on('registered', () =>
      this.emitter.emit('registrationChanged', { state: 'registered' })
    );
    this.ua.on('unregistered', () =>
      this.emitter.emit('registrationChanged', { state: 'unregistered' })
    );
    this.ua.on('registrationFailed', ({ cause }: { cause?: string }) =>
      this.emitter.emit('registrationChanged', {
        state: 'failed',
        reason: cause
      })
    );
    this.ua.on(
      'newRTCSession',
      async ({ session, originator }: { session: RTCSession; originator: string }) => {
        const direction = originator === 'local' ? 'outbound' : 'inbound';
        const call = new SimpleCallSession(session, direction);
        this.sessions.set(call.id, call);

        session.on('ended', () => {
          call.state = 'ended';
          this.emitter.emit('callUpdated', { session: call, state: 'ended' });
          this.sessions.delete(call.id);
        });
        session.on('failed', (e: { cause: string }) => {
          call.state = 'failed';
          this.emitter.emit('callUpdated', {
            session: call,
            state: 'failed',
            reason: e.cause
          });
          this.sessions.delete(call.id);
        });
        session.on('confirmed', () => {
          call.state = 'established';
          this.emitter.emit('callUpdated', {
            session: call,
            state: 'established'
          });
        });

        if (direction === 'inbound') {
          const from = session.remote_identity.uri.toString();
          const user = session.remote_identity.uri.user;
          let erpData: any;

          if (this.opts.erp?.apiUrl) {
            try {
              const param = this.opts.erp.queryParam || 'phone';
              const url = new URL(this.opts.erp.apiUrl);
              url.searchParams.append(param, user);

              const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                ...this.opts.erp.headers
              };
              if (this.opts.erp.token) {
                headers['Authorization'] = `Bearer ${this.opts.erp.token}`;
              }

              const res = await fetch(url.toString(), { headers });
              if (res.ok) {
                erpData = await res.json();
              }
            } catch (error) {
              console.error('Failed to fetch ERP data', error);
            }
          }

          if (call.state !== 'ended' && call.state !== 'failed') {
            this.emitter.emit('incomingCall', {
              session: call,
              from,
              data: erpData
            });
          }
        }
      }
    );
  }

  async call(options: CallOptions): Promise<CallSession> {
    if (!this.ua) throw new SDKError('WSS_CONNECT_FAILED', 'UA not initialized');
    const domain = this.domain ?? 'localhost';
    const target = options.target.includes('sip:')
      ? options.target
      : `sip:${options.target}@${domain}`;
    const session = this.ua.call(target, {
      extraHeaders: options.extraHeaders,
      mediaConstraints: { audio: true, video: false }
    });
    const call = new SimpleCallSession(session, 'outbound');
    this.sessions.set(call.id, call);
    return call;
  }

  getActiveSessions(): CallSession[] {
    return Array.from(this.sessions.values());
  }

  on<E extends keyof VoiceSDKEvents>(
    event: E,
    handler: (p: VoiceSDKEvents[E]) => void
  ): () => void {
    this.emitter.on(event, handler as (...args: EventMap[E]) => void);
    return () => this.emitter.off(event, handler as (...args: EventMap[E]) => void);
  }

  async destroy(): Promise<void> {
    if (this.ua) {
      this.ua.stop();
      this.ua = undefined;
    }
    this.sessions.clear();
  }
}

export type {
  VoiceSDKOptions,
  CallOptions,
  VoiceSDKEvents,
  CallSession,
  CallState
} from './types';
