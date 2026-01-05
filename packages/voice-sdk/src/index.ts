import JsSIP from 'jssip';
import EventEmitter from 'eventemitter3';
import { fetchCredentials } from './AuthClient';
import { SDKError } from './errors';
import { AudioManager } from './AudioManager';
import { TabCoordinator } from './TabCoordinator';
import { SimpleCallSession } from './CallSession';
import type {
  VoiceSDKOptions,
  CallOptions,
  VoiceSDKEvents,
  CallSession,
  CallState
} from './types';
import type { UAConfiguration } from 'jssip/lib/UA';
import type { RTCSession } from 'jssip/lib/RTCSession';

type EventMap = { [K in keyof VoiceSDKEvents]: [VoiceSDKEvents[K]] };

export class VoiceSDK {
  private opts: VoiceSDKOptions;
  private ua?: JsSIP.UA;
  private emitter = new EventEmitter<EventMap>();
  private sessions = new Map<string, SimpleCallSession>();
  private domain?: string;
  private audioManager: AudioManager;
  private tabCoordinator: TabCoordinator;
  private pcConfig?: any;

  constructor(opts: VoiceSDKOptions) {
    this.opts = opts;
    this.audioManager = new AudioManager(opts.sounds);
    this.tabCoordinator = new TabCoordinator();

    if (this.opts.ice) {
      const iceServers = [];
      if (this.opts.ice.stun) {
        this.opts.ice.stun.forEach((url) => {
          iceServers.push({ urls: url });
        });
      }
      if (this.opts.ice.turn) {
        this.opts.ice.turn.forEach((t) => {
          iceServers.push({
            urls: t.urls,
            username: t.username,
            credential: t.credential
          });
        });
      }
      this.pcConfig = { iceServers };
    }
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
        user_agent: this.opts.sip?.userAgentString,
        register_expires: this.opts.sip?.registerExpiresSec,
        connection_recovery_min_interval: this.opts.sip?.keepAliveIntervalSec, // Map keepAlive to recovery or use custom keepalive logic if JsSIP supports it, but for now strict mapping where possible.
        // JsSIP doesn't have direct 'keepAliveIntervalSec' option in UA config the way some other libs do, but it handles ping/pong.
        // We'll trust that 'register_expires' is sufficient for registration refresh.
      };

      // Apply ICE options to JsSIP (JsSIP uses 'stun_servers' and 'turn_servers' typically via RTC constraints or direct config depending on version)
      // JsSIP 3.x usually takes 'stun_servers' in configuration, but 'turn_servers' often need to be in PCConfig passed to call/answer.
      // However, JsSIP doesn't expose 'turn_servers' directly in UAConfiguration interface in all versions.
      // We will handle ICE in call/answer options via media constraints or pcConfig.

      this.ua = new JsSIP.UA(configuration);
      this.attachUaHandlers();

      // Only start if leader
      if (this.tabCoordinator.isLeader) {
        this.ua.start();
        this.emitter.emit('connectionChanged', { state: 'connecting' });
      }

      this.tabCoordinator.on('leaderElected', () => {
        console.log('VoiceSDK: Became leader tab, connecting...');
        this.ua?.start();
        this.emitter.emit('connectionChanged', { state: 'connecting' });
      });

      this.tabCoordinator.on('leaderDemoted', () => {
        console.log('VoiceSDK: Demoted to follower tab, disconnecting...');
        this.ua?.stop();
        this.emitter.emit('connectionChanged', { state: 'disconnected' });
      });

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
        const call = new SimpleCallSession(session, direction, this.pcConfig);
        this.sessions.set(call.id, call);

        if (direction === 'inbound') {
          const from = session.remote_identity.uri.toString();
          let erpData: any;

          // ERP Hook
          if (this.opts.erp) {
            try {
              const { apiUrl, token, queryParam, headers } = this.opts.erp;
              const paramName = queryParam || 'phone';
              const callerUser = session.remote_identity.uri.user;
              const url = new URL(apiUrl);
              url.searchParams.append(paramName, callerUser);

              const fetchHeaders: Record<string, string> = { ...headers };
              if (token) {
                fetchHeaders['Authorization'] = `Bearer ${token}`;
              }

              const res = await fetch(url.toString(), { headers: fetchHeaders });
              if (res.ok) {
                erpData = await res.json();
              }
            } catch (e) {
              console.warn('VoiceSDK: ERP fetch failed', e);
            }
          }

          this.emitter.emit('incomingCall', {
            session: call,
            from,
            displayName: session.remote_identity.display_name,
            data: erpData
          });
          this.audioManager.playRinging();
        }

        session.on('ended', () => {
          call.hangup(); // Update internal state/timers
          this.audioManager.stopRinging();
          this.audioManager.setRemoteStream(null);
          this.emitter.emit('callUpdated', { session: call, state: 'ended' });
          this.emitter.emit('callSummary', call.getSummary());
          this.sessions.delete(call.id);
        });

        session.on('failed', (e: { cause: string }) => {
          call.state = 'failed'; // Update internal state
          this.audioManager.stopRinging();
          this.audioManager.setRemoteStream(null);
          this.emitter.emit('callUpdated', {
            session: call,
            state: 'failed',
            reason: e.cause
          });
          this.emitter.emit('callSummary', call.getSummary());
          this.sessions.delete(call.id);
        });

        session.on('confirmed', () => {
          call.answer(); // Update internal state/timers
          this.audioManager.stopRinging();
          const stream = session.connection.getRemoteStreams()[0];
          this.audioManager.setRemoteStream(stream);
          this.emitter.emit('callUpdated', {
            session: call,
            state: 'established'
          });
        });

        // Handle stream added later (e.g. after ICE)
        session.on('peerconnection', (e: any) => {
            e.peerconnection.addEventListener('track', (event: any) => {
                 if (event.streams && event.streams[0]) {
                     this.audioManager.setRemoteStream(event.streams[0]);
                 }
            });
        });
      }
    );
  }

  async call(options: CallOptions): Promise<CallSession> {
    if (!this.ua) throw new SDKError('WSS_CONNECT_FAILED', 'UA not initialized');

    // Simplification: only leader can call for now, or we rely on leader election logic
    // to eventually support command delegation. But per requirements, just protecting
    // multi-tab registration is the key. If a follower tries to call, it might fail
    // or we can throw error.
    if (!this.tabCoordinator.isLeader) {
       // Ideally we proxy this command to the leader, but for "minimum work"
       // to just prevent registration conflicts, we will allow UA to attempt
       // (but it won't be connected).
       // Actually if UA is stopped (which we do in leaderDemoted), ua.call will likely fail.
       // Let's check:
       if (!this.ua.isConnected()) {
           throw new SDKError('NOT_CONNECTED', 'This tab is not the active phone connection. Please use the active tab.');
       }
    }

    const domain = this.domain ?? 'localhost';
    const target = options.target.includes('sip:')
      ? options.target
      : `sip:${options.target}@${domain}`;
    const session = this.ua.call(target, {
      extraHeaders: options.extraHeaders,
      pcConfig: this.pcConfig,
      mediaConstraints: this.opts.media?.constraints || {
        audio: true,
        video: false
      }
    });
    const call = new SimpleCallSession(session, 'outbound', this.pcConfig);
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
    this.tabCoordinator.close();
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
