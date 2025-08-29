import type {
  VoiceSDKOptions,
  CallOptions,
  VoiceSDKEvents,
  CallSession,
} from './types';
import { validateVoiceSDKOptions } from './validation';

export const VERSION = '0.0.1';

export class VoiceSDK {
  private readonly listeners = new Map<keyof VoiceSDKEvents, Set<(...args: unknown[]) => void>>();

  constructor(private readonly options: VoiceSDKOptions) {
    validateVoiceSDKOptions(options);
  }

  async init(): Promise<void> {
    // initialization stub
  }

  async call(destination: string, options: CallOptions = {}): Promise<CallSession> {
    // call stub
    void options;
    return {
      id: destination,
      state: 'ended',
      mute() {},
      unmute() {},
      hold() {},
      unhold() {},
      dtmf(tone: string) {
        void tone;
      },
      transfer(target: string) {
        void target;
      },
      hangup() {},
      on(event: 'ended' | 'updated', handler: () => void): void {
        void event;
        void handler;
      },
    };
  }

  on<E extends keyof VoiceSDKEvents>(event: E, handler: VoiceSDKEvents[E]): void {
    let handlers = this.listeners.get(event);
    if (!handlers) {
      handlers = new Set();
      this.listeners.set(event, handlers);
    }
    handlers.add(handler as (...args: unknown[]) => void);
  }

  off<E extends keyof VoiceSDKEvents>(event: E, handler: VoiceSDKEvents[E]): void {
    this.listeners.get(event)?.delete(handler as (...args: unknown[]) => void);
  }

  destroy(): void {
    this.listeners.clear();
  }
}

export type {
  VoiceSDKOptions,
  CallOptions,
  VoiceSDKEvents,
  CallSession,
};

export { SDKError } from './errors';
export { validateVoiceSDKOptions, validateAuthResponse } from './validation';
