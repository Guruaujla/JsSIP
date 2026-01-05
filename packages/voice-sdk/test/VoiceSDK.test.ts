import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VoiceSDK } from '../src/index';
import { VoiceSDKOptions } from '../src/types';
import JsSIP from 'jssip';

// Mock JsSIP
vi.mock('jssip', () => {
  // Simple EventEmitter implementation for the mock
  class MockEventEmitter {
    listeners = new Map();
    on(event, handler) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event).push(handler);
      return this;
    }
    off(event, handler) {
      // not implemented for mock simplicity
    }
    emit(event, ...args) {
      const handlers = this.listeners.get(event);
      if (handlers) {
        handlers.forEach(h => h(...args));
      }
    }
  }

  // We mock UA as a class that returns a MockEventEmitter instance with required methods
  class MockUA extends MockEventEmitter {
    start = vi.fn();
    stop = vi.fn();
    call = vi.fn();
    configuration: any;

    constructor(config: any) {
        super();
        this.configuration = config;
    }
  }

  // The issue is likely how default export is mocked vs named export vs how the code imports it.
  // The code has: import JsSIP from 'jssip'; ... new JsSIP.UA(config)
  // This means JsSIP is the default export which is an object containing UA.

  return {
    default: {
      UA: MockUA,
      WebSocketInterface: vi.fn(),
    },
    // Sometimes imports might look for named exports too depending on esModuleInterop
    UA: MockUA,
    WebSocketInterface: vi.fn(),
  };
});

describe('VoiceSDK', () => {
  const mockOptions: VoiceSDKOptions = {
    authServer: 'https://auth.example.com',
    token: 'mock-token',
  };

  const mockCredentials = {
    username: 'user1',
    domain: 'sip.example.com',
    password: 'password',
    wssUrl: 'wss://sip.example.com',
  };

  beforeEach(() => {
    vi.resetAllMocks();

    // Mock fetch for AuthClient
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('sip-credentials')) {
         return Promise.resolve({
            ok: true,
            json: async () => mockCredentials,
         });
      }
      return Promise.resolve({ ok: false });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes correctly', async () => {
    const sdk = new VoiceSDK(mockOptions);
    await sdk.init();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://auth.example.com/sip-credentials',
      expect.objectContaining({
        headers: { Authorization: 'Bearer mock-token' },
      })
    );

    // We can't easily check if UA constructor was called with specific args if it's not a spy
    // But we can check if fetch was called.
  });

  it('emits incomingCall event on new inbound RTCSession', async () => {
    const sdk = new VoiceSDK(mockOptions);
    await sdk.init();

    // Get the UA instance
    // @ts-ignore
    const ua = sdk.ua;

    // Mock Session
    class MockSession {
      listeners = new Map();
      id = 'session-123';
      remote_identity = {
        uri: {
          toString: () => 'sip:caller@example.com',
          user: 'caller'
        }
      };
      answer = vi.fn();
      terminate = vi.fn();
      on(event, handler) {
         if (!this.listeners.has(event)) this.listeners.set(event, []);
         this.listeners.get(event).push(handler);
      }
      emit(event, ...args) {
          const handlers = this.listeners.get(event);
          if (handlers) handlers.forEach(h => h(...args));
      }
    }

    const mockSession = new MockSession();

    const onIncomingCall = vi.fn();
    sdk.on('incomingCall', onIncomingCall);

    // Simulate incoming call
    // The handler is async now, so we need to wait a bit or use fake timers
    ua.emit('newRTCSession', { session: mockSession, originator: 'remote' });

    // Allow async handlers to run
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(onIncomingCall).toHaveBeenCalled();
    const eventData = onIncomingCall.mock.calls[0][0];
    expect(eventData.from).toBe('sip:caller@example.com');
    expect(eventData.session.id).toBe('session-123');
  });

  it('fetches ERP data on incoming call if configured', async () => {
    const erpOptions: VoiceSDKOptions = {
      ...mockOptions,
      erp: {
        apiUrl: 'https://erp.example.com/api/contacts',
        token: 'erp-token',
        queryParam: 'phone_number',
      }
    };

    const sdk = new VoiceSDK(erpOptions);
    await sdk.init();

    const erpResponse = { id: 1, name: 'Caller Name' };

    // Update fetch mock to handle ERP call
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('sip-credentials')) {
         return Promise.resolve({
            ok: true,
            json: async () => mockCredentials,
         });
      }
      if (url.includes('erp.example.com')) {
          return Promise.resolve({
            ok: true,
            json: async () => erpResponse,
         });
      }
      return Promise.resolve({ ok: false });
    });

    // @ts-ignore
    const ua = sdk.ua;

     // Mock Session
    class MockSession {
      listeners = new Map();
      id = 'session-456';
      remote_identity = {
        uri: {
          toString: () => 'sip:caller2@example.com',
          user: 'caller2'
        }
      };
      answer = vi.fn();
      terminate = vi.fn();
      on(event, handler) {
         if (!this.listeners.has(event)) this.listeners.set(event, []);
         this.listeners.get(event).push(handler);
      }
      emit(event, ...args) {
          const handlers = this.listeners.get(event);
          if (handlers) handlers.forEach(h => h(...args));
      }
    }

    const mockSession = new MockSession();
    const onIncomingCall = vi.fn();
    sdk.on('incomingCall', onIncomingCall);

    ua.emit('newRTCSession', { session: mockSession, originator: 'remote' });

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://erp.example.com/api/contacts'),
        expect.objectContaining({
            headers: expect.objectContaining({
                Authorization: 'Bearer erp-token'
            })
        })
    );
    // Check URL params
    const calledUrl = (global.fetch as any).mock.calls.find((call: any[]) => call[0].includes('erp.example.com'))[0];
    expect(calledUrl).toContain('phone_number=caller2');

    expect(onIncomingCall).toHaveBeenCalled();
    const eventData = onIncomingCall.mock.calls[0][0];
    expect(eventData.data).toEqual(erpResponse);
  });
});
